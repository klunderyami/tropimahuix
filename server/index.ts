import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import dotenv from 'dotenv';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import admin, { cert } from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';
import { getAuth } from 'firebase-admin/auth';
import type { DocumentData, FieldValue as FirestoreFieldValue, Firestore, Query } from 'firebase-admin/firestore';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { batchUploadProducts, isProductPayload } from './productBatchUpload.js';
import type { ProductPayload } from './productBatchUpload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolución jerárquica de archivos de entorno
const envFiles = [
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '..', '.env'),
  path.resolve(process.cwd(), 'server', '.env'),
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseBase64FirebaseConfig(base64Value: string): admin.ServiceAccount {
  try {
    const decodedJson = Buffer.from(base64Value, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(decodedJson);

    if (!isRecord(serviceAccount)) {
      throw new Error('FIREBASE_CONFIG_BASE64 must decode to a valid JSON object.');
    }

    if (typeof serviceAccount.privateKey === 'string') {
      serviceAccount.privateKey = serviceAccount.privateKey.replace(/\\n/g, '\n');
    }

    return serviceAccount as admin.ServiceAccount;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid FIREBASE_CONFIG_BASE64 value.';
    throw new Error(`Unable to parse FIREBASE_CONFIG_BASE64: ${message}`);
  }
}

function buildFirebaseServiceAccountFromEnv(): admin.ServiceAccount | null {
  if (typeof process.env.FIREBASE_CONFIG_BASE64 === 'string' && process.env.FIREBASE_CONFIG_BASE64.trim().length > 0) {
    return parseBase64FirebaseConfig(process.env.FIREBASE_CONFIG_BASE64);
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
    ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

// Inicialización de Servicios Núcleo
const serviceAccount = buildFirebaseServiceAccountFromEnv();
let db!: Firestore;
let auth!: Auth;
let firebaseInitError: string | null = null;

let firebaseInitialized = false;

if (!serviceAccount) {
  firebaseInitError =
    'Missing Firebase Admin service account configuration. Set FIREBASE_CONFIG_BASE64 or FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.';
  console.error(firebaseInitError);
} else {
  try {
    admin.initializeApp({
      credential: cert(serviceAccount),
    });
    db = getFirestore();
    auth = getAuth();
  } catch (error) {
    firebaseInitError = error instanceof Error ? error.message : 'Firebase Admin SDK initialization failed.';
    console.error('Firebase Admin initialization error:', firebaseInitError);
  }
}

const app = express();
const PORT = Number(process.env.PORT || 9005);
const ADMIN_UID = process.env.ADMIN_UID || process.env.FIREBASE_ADMIN_UID || process.env.VITE_FIREBASE_ADMIN_UID || process.env.VITE_ADMIN_UID;
const PAYPAL_MODE = process.env.PAYPAL_MODE === 'live' || process.env.VITE_PAYPAL_MODE === 'live' ? 'live' : 'sandbox';
const PAYPAL_API_BASE = PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
const PAYPAL_CURRENCY = process.env.PAYPAL_CURRENCY || 'MXN';
const FRONTEND_DIST_DIR = path.resolve(process.cwd(), 'dist');
const FRONTEND_INDEX_HTML = path.join(FRONTEND_DIST_DIR, 'index.html');

const ALLOWED_ORIGINS = new Set(
  ['http://localhost:5173', 'http://127.0.0.1:5173', process.env.CLIENT_ORIGIN].filter(
    (origin): origin is string => Boolean(origin),
  ),
);

type OrderStatus = 'pending' | 'paid' | 'failed' | 'delivered';

interface AuthenticatedRequest extends Request {
  auth?: {
    uid: string;
  };
}

interface CheckoutItemInput {
  id: string;
  quantity: number;
}

interface ShippingAddress {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderDocument {
  userId: string | 'guest';
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  paypalOrderId: string;
  createdAt: string;
  updatedAt?: FirestoreFieldValue;
  paidAt?: string;
  failedAt?: string;
}

interface PayPalCaptureResponse {
  id?: string;
  status?: string;
  purchase_units?: {
    payments?: {
      captures?: {
        id?: string;
        status?: string;
        amount?: {
          currency_code?: string;
          value?: string;
        };
      }[];
    };
  }[];
}

interface PayPalErrorPayload {
  name?: string;
  message?: string;
  details?: unknown;
}

interface ProductDocument extends ProductPayload {
  id: string;
}

function getHeaderValue(req: Request, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function getEnv(name: string, fallbackName: string): string | undefined {
  return process.env[name] || process.env[fallbackName];
}

function getRequiredEnvWithFallback(name: string, fallbackName: string): string {
  const value = getEnv(name, fallbackName) ?? process.env[name] ?? process.env[fallbackName];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required server environment variable: ${name} or ${fallbackName}`);
  }

  return value;
}

function getBearerToken(req: Request): string | undefined {
  return getHeaderValue(req, 'authorization')?.replace(/^Bearer\s+/i, '');
}

function normalizeString(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function centsToMoney(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

function toMoney(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

// Middlewares de Enrutamiento, CORS e Inyección JSON
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health' && firebaseInitError) {
    res.status(500).json({ error: firebaseInitError });
    return;
  }

  const origin = getHeaderValue(req, 'origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json({ limit: '1mb' }));

if (fs.existsSync(FRONTEND_INDEX_HTML)) {
  app.use(express.static(FRONTEND_DIST_DIR));
}

// Validadores de Estructura de Datos
function isCheckoutItem(value: unknown): value is CheckoutItemInput {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    value.id.trim().length <= 120 &&
    typeof value.quantity === 'number' &&
    Number.isInteger(value.quantity) &&
    value.quantity > 0 &&
    value.quantity <= 99
  );
}

function parseCheckoutItems(value: unknown): CheckoutItemInput[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    return null;
  }

  if (!value.every(isCheckoutItem)) {
    return null;
  }

  const itemMap = new Map<string, number>();
  for (const item of value) {
    const id = item.id.trim();
    itemMap.set(id, (itemMap.get(id) || 0) + item.quantity);
  }

  const normalizedItems = Array.from(itemMap.entries()).map(([id, quantity]) => ({ id, quantity }));
  const hasInvalidQuantity = normalizedItems.some((item) => item.quantity > 99);

  return hasInvalidQuantity ? null : normalizedItems;
}

function isShippingAddress(value: unknown): value is ShippingAddress {
  if (!isRecord(value)) return false;
  return (
    typeof value.name === 'string' &&
    value.name.trim().length >= 2 &&
    value.name.trim().length <= 120 &&
    typeof value.email === 'string' &&
    value.email.trim().length >= 5 &&
    value.email.trim().length <= 160 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim()) &&
    typeof value.phone === 'string' &&
    value.phone.trim().length >= 8 &&
    value.phone.trim().length <= 30 &&
    typeof value.street === 'string' &&
    value.street.trim().length >= 4 &&
    value.street.trim().length <= 240 &&
    typeof value.city === 'string' &&
    value.city.trim().length >= 2 &&
    value.city.trim().length <= 120
  );
}

function normalizeShippingAddress(address: ShippingAddress): ShippingAddress {
  return {
    name: normalizeString(address.name),
    email: address.email.trim().toLowerCase(),
    phone: normalizeString(address.phone),
    street: normalizeString(address.street),
    city: normalizeString(address.city),
  };
}

function isProductUpdatePayload(payload: unknown): payload is Partial<ProductPayload> {
  if (!isRecord(payload)) return false;

  const allowedKeys = new Set(['name', 'description', 'price', 'volume', 'image', 'category', 'stock', 'active']);
  const stock = payload.stock;

  if (!Object.keys(payload).every((key) => allowedKeys.has(key))) {
    return false;
  }

  return (
    (payload.name === undefined || (typeof payload.name === 'string' && payload.name.trim().length > 0)) &&
    (payload.description === undefined || (typeof payload.description === 'string' && payload.description.trim().length > 0)) &&
    (payload.price === undefined || (typeof payload.price === 'number' && Number.isFinite(payload.price) && payload.price > 0)) &&
    (payload.volume === undefined || (typeof payload.volume === 'string' && payload.volume.trim().length > 0)) &&
    (payload.image === undefined || (typeof payload.image === 'string' && payload.image.trim().length > 0)) &&
    (payload.category === undefined || payload.category === 'licor' || payload.category === 'torito') &&
    (stock === undefined || (typeof stock === 'number' && Number.isInteger(stock) && stock >= 0)) &&
    (payload.active === undefined || typeof payload.active === 'boolean')
  );
}

function getRouteParam(value: string | string[] | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function parseOrderDocument(value: DocumentData | undefined): OrderDocument | null {
  if (!value) return null;
  const status = value.status;

  if (
    (status !== 'pending' && status !== 'paid' && status !== 'failed' && status !== 'delivered') ||
    !Array.isArray(value.items) ||
    typeof value.total !== 'number' ||
    typeof value.paypalOrderId !== 'string' ||
    !isShippingAddress(value.shippingAddress) ||
    typeof value.createdAt !== 'string'
  ) {
    return null;
  }

  return value as OrderDocument;
}

// Sistema de Notificaciones Webhook Automático
async function sendOrderNotificationWebhook(orderId: string, order: OrderDocument): Promise<void> {
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL?.trim();
  if (!webhookUrl) return;

  const productLines = order.items.map((item) => `- ${item.quantity} x ${item.name}`).join('\n');
  const text = `🔔 ¡NUEVO PEDIDO CONFIRMADO EN TROPICAÑA! 🔔\n- Orden ID: ${orderId}\n- Cliente: ${order.shippingAddress.name || order.shippingAddress.email}\n- Total: $${toMoney(order.total)} MXN\n- Productos:\n${productLines}`;

  const payload = { content: text, text, username: 'Tropicaña Bot' };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silently ignore webhook errors to avoid blocking transactional flow
  }
}

// Filtros de Autenticación y Control de Roles de Seguridad
async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Missing Firebase ID token.' });
    return;
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    if (!ADMIN_UID || decodedToken.uid !== ADMIN_UID) {
      res.status(403).json({ error: 'Admin access required.' });
      return;
    }
    req.auth = { uid: decodedToken.uid };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid Firebase ID token.' });
  }
}

async function getOptionalUserId(req: Request): Promise<string | 'guest'> {
  const token = getBearerToken(req);
  if (!token) return 'guest';

  try {
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken.uid;
  } catch {
    return 'guest';
  }
}

// Pasarela de Pagos (PayPal API Integration Engine)
function getPayPalCredentials(): { clientId: string; clientSecret: string } {
  return {
    clientId: getRequiredEnvWithFallback('PAYPAL_CLIENT_ID', 'VITE_PAYPAL_CLIENT_ID'),
    clientSecret: getRequiredEnvWithFallback('PAYPAL_CLIENT_SECRET', 'PAYPAL_CLIENT_SECRET'),
  };
}

async function getPayPalAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getPayPalCredentials();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'Accept-Language': 'en_US',
    },
    body: 'grant_type=client_credentials',
  });

  const payload = (await response.json().catch(() => ({}))) as { access_token?: string; error_description?: string };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || `PayPal token request failed with status ${response.status}.`);
  }

  return payload.access_token;
}

async function capturePayPalOrder(paypalOrderId: string): Promise<PayPalCaptureResponse> {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  const payload = (await response.json().catch(() => ({}))) as PayPalCaptureResponse & PayPalErrorPayload;

  if (!response.ok) {
    throw new Error(payload.message || payload.name || `PayPal capture failed with status ${response.status}.`);
  }

  return payload;
}

function getCapturedAmount(capture: PayPalCaptureResponse): { currency: string; value: number } | null {
  const captureUnit = capture.purchase_units?.[0]?.payments?.captures?.[0];
  const amount = captureUnit?.amount;

  if (capture.status !== 'COMPLETED' || captureUnit?.status !== 'COMPLETED' || !amount?.currency_code || !amount.value) {
    return null;
  }

  const value = Number(amount.value);
  return Number.isFinite(value) && value > 0 ? { currency: amount.currency_code, value } : null;
}

async function restoreOrderStock(order: OrderDocument): Promise<void> {
  await db.runTransaction(async (transaction) => {
    for (const item of order.items) {
      const productRef = db.collection('products').doc(item.id);
      transaction.update(productRef, {
        stock: FieldValue.increment(item.quantity),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

async function failOrder(orderId: string, paypalOrderId: string, order: OrderDocument): Promise<void> {
  await restoreOrderStock(order);
  await db.collection('orders').doc(orderId).set(
    {
      status: 'failed',
      paypalOrderId,
      failedAt: new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

// Endpoints REST de la API de Control (Express Routing)
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: firebaseInitError ? 'degraded' : 'success',
    message: firebaseInitError
      ? 'El backend está en línea pero Firebase Admin no está configurado correctamente.'
      : 'El backend de Tropicana está vivo y conectado.',
    paypalMode: PAYPAL_MODE,
    firebaseInitialized: !firebaseInitError,
    firebaseInitError,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/products', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const snapshot = await db.collection('products').get();
    const products = snapshot.docs
      .map<ProductDocument>((doc) => ({ id: doc.id, ...(doc.data() as ProductPayload) }))
      .filter((product) => product.active !== false);

    res.status(200).json({ products });
  } catch (error) {
    next(error);
  }
});

app.post('/api/products', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isProductPayload(req.body)) {
      res.status(400).json({ error: 'Invalid product payload.' });
      return;
    }

    const productRef = await db.collection('products').add({
      ...req.body,
      active: req.body.active ?? true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.status(201).json({ id: productRef.id });
  } catch (error) {
    next(error);
  }
});

app.post('/api/products/batch', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as { products?: unknown };
    const products = Array.isArray(body.products) ? body.products : req.body;

    if (!Array.isArray(products) || products.length === 0) {
      res.status(400).json({ error: 'Send an array of products or { products: [...] }.' });
      return;
    }

    if (products.length > 500) {
      res.status(400).json({ error: 'Firestore batch writes are limited to 500 products per request.' });
      return;
    }

    const invalidIndex = products.findIndex((product) => !isProductPayload(product));
    if (invalidIndex >= 0) {
      res.status(400).json({ error: `Invalid product payload at index ${invalidIndex}.` });
      return;
    }

    const ids = await batchUploadProducts(db, products);
    res.status(201).json({ status: 'created', count: ids.length, ids });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/products/:productId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = getRouteParam(req.params.productId);
    if (!productId) {
      res.status(400).json({ error: 'Missing product id.' });
      return;
    }

    if (!isProductUpdatePayload(req.body)) {
      res.status(400).json({ error: 'Invalid product update payload.' });
      return;
    }

    await db.collection('products').doc(productId).set(
      { ...req.body, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

    res.status(200).json({ status: 'updated' });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/products/:productId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = getRouteParam(req.params.productId);
    if (!productId) {
      res.status(400).json({ error: 'Missing product id.' });
      return;
    }

    await db.collection('products').doc(productId).set(
      { active: false, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

    res.status(200).json({ status: 'archived' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/config', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const configSnapshot = await db.collection('config').doc('site').get();
    res.status(200).json({ config: configSnapshot.exists ? configSnapshot.data() : {} });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/config', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.collection('config').doc('site').set(
      { ...req.body, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    res.status(200).json({ status: 'updated' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/orders/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as { items?: unknown; shippingAddress?: unknown };
    const items = parseCheckoutItems(body.items);

    if (!items) {
      res.status(400).json({ error: 'Invalid cart items.' });
      return;
    }

    if (!isShippingAddress(body.shippingAddress)) {
      res.status(400).json({ error: 'Invalid shipping address.' });
      return;
    }

    const userId = await getOptionalUserId(req);
    const shippingAddress = normalizeShippingAddress(body.shippingAddress);
    const orderRef = db.collection('orders').doc();

    const result = await db.runTransaction(async (transaction) => {
      const productRefs = items.map((item) => db.collection('products').doc(item.id));
      const productSnapshots = await Promise.all(productRefs.map((ref) => transaction.get(ref)));
      const orderItems: OrderItem[] = [];
      let totalCents = 0;

      for (let index = 0; index < productSnapshots.length; index += 1) {
        const snapshot = productSnapshots[index];
        const item = items[index];

        if (!snapshot.exists) {
          throw new Error(`Product ${item.id} was not found.`);
        }

        const product = snapshot.data() as Partial<ProductPayload>;
        if (!isProductPayload(product) || product.active === false) {
          throw new Error(`Product ${item.id} is not available.`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}.`);
        }

        orderItems.push({
          id: snapshot.id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
        });

        totalCents += Math.round(product.price * 100) * item.quantity;
      }

      for (let index = 0; index < productRefs.length; index += 1) {
        transaction.update(productRefs[index], {
          stock: FieldValue.increment(-items[index].quantity),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      const total = centsToMoney(totalCents);
      const createdAt = new Date().toISOString();

      transaction.set(orderRef, {
        userId,
        items: orderItems,
        total,
        status: 'pending',
        shippingAddress,
        paypalOrderId: '',
        createdAt,
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies OrderDocument);

      return {
        orderId: orderRef.id,
        total,
        currency: PAYPAL_CURRENCY,
        items: orderItems,
      };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/orders/capture', async (req: Request, res: Response, next: NextFunction) => {
  const body = req.body as { orderId?: unknown; paypalOrderId?: unknown };

  try {
    if (typeof body.orderId !== 'string' || body.orderId.trim().length === 0) {
      res.status(400).json({ error: 'orderId is required.' });
      return;
    }

    if (typeof body.paypalOrderId !== 'string' || body.paypalOrderId.trim().length === 0) {
      res.status(400).json({ error: 'paypalOrderId is required.' });
      return;
    }

    const orderId = body.orderId.trim();
    const paypalOrderId = body.paypalOrderId.trim();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnapshot = await orderRef.get();

    if (!orderSnapshot.exists) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const order = parseOrderDocument(orderSnapshot.data());
    if (!order) {
      res.status(500).json({ error: 'Stored order is malformed.' });
      return;
    }

    if (order.status === 'paid' && order.paypalOrderId === paypalOrderId) {
      res.status(200).json({ status: 'paid', orderId, paypalOrderId });
      return;
    }

    if (order.status !== 'pending') {
      res.status(400).json({ error: 'Order cannot be captured in its current state.' });
      return;
    }

    const paypalCapture = await capturePayPalOrder(paypalOrderId);
    const capturedAmount = getCapturedAmount(paypalCapture);

    if (!capturedAmount) {
      await failOrder(orderId, paypalOrderId, order);
      res.status(400).json({ error: 'PayPal did not confirm a completed capture.' });
      return;
    }

    if (capturedAmount.currency !== PAYPAL_CURRENCY || toMoney(capturedAmount.value) !== toMoney(order.total)) {
      await failOrder(orderId, paypalOrderId, order);
      res.status(400).json({ error: 'PayPal capture amount does not match the internal order total.' });
      return;
    }

    await orderRef.set(
      {
        status: 'paid',
        paypalOrderId,
        paidAt: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await sendOrderNotificationWebhook(orderId, {
      ...order,
      status: 'paid',
      paypalOrderId,
    });

    res.status(200).json({
      status: 'paid',
      orderId,
      paypalOrderId,
      paypalCaptureId: paypalCapture.id,
    });
  } catch (error) {
    try {
      if (typeof body.orderId === 'string' && typeof body.paypalOrderId === 'string') {
        const orderSnapshot = await db.collection('orders').doc(body.orderId.trim()).get();
        const order = parseOrderDocument(orderSnapshot.data());

        if (orderSnapshot.exists && order?.status === 'pending') {
          await failOrder(body.orderId.trim(), body.paypalOrderId.trim(), order);
        }
      }
    } catch (rollbackError) {
      next(rollbackError);
      return;
    }
    next(error);
  }
});

app.get('/api/orders', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : null;
    let query: Query = db.collection('orders');

    if (status && ['pending', 'paid', 'failed', 'delivered'].includes(status)) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').limit(100).get();
    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({ orders });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/orders/:orderId/status', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = getRouteParam(req.params.orderId);
    const body = req.body as { status?: unknown };

    if (!orderId) {
      res.status(400).json({ error: 'Missing order id.' });
      return;
    }

    if (body.status !== 'pending' && body.status !== 'paid' && body.status !== 'failed' && body.status !== 'delivered') {
      res.status(400).json({ error: 'Invalid order status.' });
      return;
    }

    await db.collection('orders').doc(orderId).set(
      { status: body.status, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

    res.status(200).json({ status: body.status });
  } catch (error) {
    next(error);
  }
});

// Enrutador Fallback Single Page Application (SPA Linker)
if (fs.existsSync(FRONTEND_INDEX_HTML)) {
  app.get(/^(?!\/api).*/, (_req: Request, res: Response) => {
    res.sendFile(FRONTEND_INDEX_HTML);
  });
}

// Middleware Global de Captura y Clasificación de Errores
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  const conflictSignals = ['stock', 'not available', 'was not found'];
  const status = conflictSignals.some((signal) => message.toLowerCase().includes(signal)) ? 400 : 500;

  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`Tropicana API listening on http://localhost:${PORT}`);
});