import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import dotenv from 'dotenv';
import express from 'express';
import type { NextFunction, Request, Response } from 'express'; // Mantener para Express
import admin from 'firebase-admin';
import { cert } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

// --- INICIO: SECCIÓN DE INICIALIZACIÓN DE SERVICIOS ---

let supabase: SupabaseClient;
let supabaseStorage: SupabaseClient;
let auth: Auth;
let serviceInitializationError: Error | null = null;

function initializeServices(): { supabase: SupabaseClient; supabaseStorage: SupabaseClient; auth: Auth } | { error: Error } {
  // 1. Inicializar Firebase Admin solo para Autenticación
  // Esto es necesario para verificar los tokens de ID de Firebase del frontend.
  try {
    // Si ya hay una app de Firebase inicializada, usa esa
    if (admin.apps.length === 0) {
      const serviceAccountPath = path.resolve(__dirname, 'firebase-service-account.json');
      if (fs.existsSync(serviceAccountPath)) {
        const rawData = fs.readFileSync(serviceAccountPath, 'utf-8');
        const serviceAccount = JSON.parse(rawData) as admin.ServiceAccount;
        admin.initializeApp({ credential: cert(serviceAccount) });
        console.log('🚀 [Firebase Admin] Initialized for auth using local service account.');
      } else {
        const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
        if (!projectId || !clientEmail || !privateKey) {
          throw new Error('Missing Firebase Admin environment variables for token verification.');
        }
        admin.initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
        console.log('🚀 [Firebase Admin] Initialized for auth using environment variables.');
      }
    } else {
      console.log('✅ [Firebase Admin] Existing app instance found.');
    }
    auth = getAuth();
  } catch (error) {
    const initError = error instanceof Error ? error : new Error('Firebase Admin SDK for auth failed to initialize.');
    console.error('❌ [Firebase Admin]', initError);
    return { error: initError };
  }

  // 2. Inicializar el cliente Admin de Supabase
  // Este cliente usa la SERVICE_ROLE_KEY para bypass RLS.
  try {
    // Leer variables de entorno DESPUÉS de cargar dotenv
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.');
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log('🚀 [Supabase Admin] Initialized successfully.');
    
    // Inicializar cliente de Supabase Storage con credenciales S3
    // Usar las mismas credenciales (leídas después de dotenv)
    const supabaseStorageClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log('🚀 [Supabase Storage] Initialized successfully.');
    
    return { supabase: supabaseClient, supabaseStorage: supabaseStorageClient, auth };
  } catch (error) {
    const initError = error instanceof Error ? error : new Error('Supabase Admin client failed to initialize.');
    console.error('❌ [Supabase Admin]', initError);
    return { error: initError };
  }
}

const result = initializeServices();

if ('error' in result) {
  serviceInitializationError = result.error;
} else {
  supabase = result.supabase;
  supabaseStorage = result.supabaseStorage;
  auth = result.auth;
}

// --- FIN: SECCIÓN DE INICIALIZACIÓN DE FIREBASE REFACTORIZADA ---

const app = express();
app.disable('x-powered-by');
const PORT = Number(process.env.PORT || 9005);
const ADMIN_UID =
  process.env.ADMIN_UID ||
  process.env.FIREBASE_ADMIN_UID ||
  process.env.VITE_FIREBASE_ADMIN_UID ||
  process.env.VITE_ADMIN_UID;
if (!ADMIN_UID) {
  console.warn(
    '⚠️ No se ha configurado ningún UID de administrador. Define ADMIN_UID, FIREBASE_ADMIN_UID, VITE_FIREBASE_ADMIN_UID o VITE_ADMIN_UID en tu entorno.',
  );
}
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

// Representa la estructura de una orden en la BD de Supabase
interface Order {
  id?: string;
  user_id: string | 'guest';
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  shipping_address: ShippingAddress;
  paypal_order_id: string;
  created_at?: string;
  updated_at?: string;
  paid_at?: string;
  failed_at?: string;
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

function getHeaderValue(req: Request, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function getRequiredEnvWithFallback(name: string, fallbackName: string): string {
  const value = process.env[name] || process.env[fallbackName];

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

function toMoney(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

// Middleware Global de Sanitización, Seguridad y Caché Quirúrgico
app.use((req: Request, res: Response, next: NextFunction) => {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'; block-all-mixed-content;");

  const url = req.url;

  if (url.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  } else {
    if (url.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    }
    if (url.includes('/assets/') || url.match(/\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|css|js)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }
  }

  next();
});

// Middlewares de Enrutamiento, CORS e Inyección JSON
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health' && serviceInitializationError) {
    return res.status(500).json({ error: serviceInitializationError.message });
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
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: '1mb' }));

if (fs.existsSync(FRONTEND_INDEX_HTML)) {
  app.use(express.static(FRONTEND_DIST_DIR));
}

// Validadores de Estructura de Datos
function isCheckoutItem(value: unknown): value is CheckoutItemInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.quantity === 'number';
}

function parseCheckoutItems(value: unknown): CheckoutItemInput[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter(isCheckoutItem);
}

function isShippingAddress(value: unknown): value is ShippingAddress {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const addr = value as Record<string, unknown>;
  return (
    typeof addr.name === 'string' &&
    typeof addr.email === 'string' &&
    typeof addr.phone === 'string' &&
    typeof addr.street === 'string' &&
    typeof addr.city === 'string'
  );
}

function normalizeShippingAddress(address: ShippingAddress): ShippingAddress {
  return {
    name: normalizeString(address.name),
    email: normalizeString(address.email),
    phone: normalizeString(address.phone),
    street: normalizeString(address.street),
    city: normalizeString(address.city),
  };
}

function isProductUpdatePayload(payload: unknown): payload is Partial<ProductPayload> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return false;
  const p = payload as Record<string, unknown>;
  const isValid =
    (p.name === undefined || typeof p.name === 'string') &&
    (p.description === undefined || typeof p.description === 'string') &&
    (p.price === undefined || typeof p.price === 'number') &&
    (p.volume === undefined || typeof p.volume === 'string') &&
    (p.image === undefined || typeof p.image === 'string') &&
    (p.category === undefined || (p.category === 'licor' || p.category === 'torito')) &&
    (p.stock === undefined || typeof p.stock === 'number') &&
    (p.active === undefined || typeof p.active === 'boolean');
  return isValid;
}

function getRouteParam(value: string | string[] | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

// Sistema de Notificaciones Webhook Automático
async function sendOrderNotificationWebhook(orderId: string, order: Order): Promise<void> {
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL?.trim();
  if (!webhookUrl) return;

  const productLines = order.items.map((item) => `- ${item.quantity} x ${item.name}`).join('\n');
  const text = `🔔 ¡NUEVO PEDIDO CONFIRMADO EN TROPICAÑA! 🔔
- Orden ID: ${orderId}
- Cliente: ${order.shipping_address.name || order.shipping_address.email}
- Total: $${toMoney(order.total)}
- Productos:
${productLines}`;

  const payload = { content: text, text, username: 'Tropicaña Bot' };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silently ignore webhook errors
  }
}

// Filtros de Autenticación y Control de Roles de Seguridad
async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = getBearerToken(req);
    if (!token) {
      console.error('[Auth Error] No token provided in Authorization header');
      res.status(401).json({ error: 'Missing authorization token.' });
      return;
    }

    try {
      const decoded = await auth.verifyIdToken(token);
      const uid = decoded.uid;

      // Validar que sea admin si está configurado ADMIN_UID
      if (ADMIN_UID && uid !== ADMIN_UID) {
        console.error(`[Auth Error] User ${uid} is not admin (expected ${ADMIN_UID})`);
        res.status(403).json({ error: 'Forbidden: Admin access required.' });
        return;
      }

      req.auth = { uid };
      next();
    } catch (tokenError) {
      console.error('[Firebase Token Verification] Invalid or expired token:', tokenError instanceof Error ? tokenError.message : String(tokenError));
      res.status(401).json({ error: 'Invalid or expired authorization token.' });
      return;
    }
  } catch (error) {
    console.error('[Auth Middleware Error]', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Authentication middleware error.' });
  }
}

async function getOptionalUserId(req: Request): Promise<string | 'guest'> {
  const token = getBearerToken(req);
  if (!token) return 'guest';
  
  try {
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return 'guest';
  }
}

// Pasarela de Pagos (PayPal)
async function capturePayPalOrder(paypalOrderId: string): Promise<PayPalCaptureResponse> {
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.PAYPAL_CLIENT_SECRET}`,
    },
  });

  if (!response.ok) {
    throw new Error(`PayPal capture failed: ${response.statusText}`);
  }

  return response.json();
}

function getCapturedAmount(paypalCapture: PayPalCaptureResponse): { currency_code?: string; value?: string } | undefined {
  try {
    const purchaseUnit = paypalCapture.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];
    return capture?.amount;
  } catch {
    return undefined;
  }
}

// Endpoints REST de la API
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

app.get('/api/products', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or('active.eq.true,active.is.null')
      .order('name', { ascending: true });

    if (error) throw error;

    res.status(200).json({ products: data ?? [] });
  } catch (error) {
    console.error('Error fetching products:', error);
    next(error);
  }
});

// Endpoint para crear un nuevo producto
app.post('/api/products', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productData = req.body;
    // Validar la estructura del payload del producto
    if (!isProductPayload(productData)) {
      return res.status(400).json({ error: 'Invalid product data provided.' });
    }

    // Asegurarse de que la categoría se guarde en minúsculas
    const category = productData.category?.toLowerCase();
    if (category !== 'licor' && category !== 'torito') {
      return res.status(400).json({ error: 'Invalid category. Must be "licor" or "torito".' });
    }
    productData.category = category;

    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select('id')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create product, no data returned.');

    res.status(201).json({ id: data.id, message: 'Product created successfully.' });
  } catch (error) {
    console.error('Error creating product:', error);
    next(error); // Pasar el error al manejador global de errores
  }
});

// Endpoint para actualizar un producto existente
app.patch('/api/products/:productId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = getRouteParam(req.params.productId);
    if (!productId) {
      return res.status(400).json({ error: 'Missing product id.' });
    }

    const productUpdateData = req.body;
    // Validar la estructura del payload de actualización del producto
    if (!isProductUpdatePayload(productUpdateData)) {
      return res.status(400).json({ error: 'Invalid product update data provided.' });
    }

    // Asegurarse de que la categoría se guarde en minúsculas si se proporciona
    if (productUpdateData.category) {
      const category = productUpdateData.category.toLowerCase();
      if (category !== 'licor' && category !== 'torito') {
        return res.status(400).json({ error: 'Invalid category. Must be "licor" or "torito".' });
      }
      productUpdateData.category = category;
    }

    const { error } = await supabase
      .from('products')
      .update({ ...productUpdateData, updated_at: new Date().toISOString() })
      .eq('id', productId);

    if (error) throw error;

    res.status(200).json({ status: 'updated', message: 'Product updated successfully.' });
  } catch (error) {
    console.error('Error updating product:', error);
    next(error); // Pasar el error al manejador global de errores
  }
});

app.delete('/api/products/:productId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = getRouteParam(req.params.productId);
    if (!productId) {
      return res.status(400).json({ error: 'Missing product id.' });
    }
    const { error } = await supabase
      .from('products')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', productId);

    if (error) throw error;

    res.status(200).json({ status: 'archived' });
  } catch (error) {
    next(error);
  }
});

// Endpoint para subir imágenes a Supabase Storage
app.post('/api/upload/image', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageBase64, fileName } = req.body;
    
    console.log('📤 [Upload] Recibida solicitud de subida:', {
      hasImageBase64: !!imageBase64,
      hasFileName: !!fileName,
      fileName,
      imageBase64Length: imageBase64?.length || 0,
    });
    
    if (!imageBase64 || !fileName) {
      return res.status(400).json({ error: 'Se requiere imageBase64 y fileName' });
    }
    
    // Convertir base64 a buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    console.log('📤 [Upload] Buffer creado:', {
      bufferSize: buffer.length,
      bufferSizeKB: (buffer.length / 1024).toFixed(2)
    });
    
    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const safeFileName = `${timestamp}-${fileName.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    const filePath = `productos/${safeFileName}`;
    
    console.log('📤 [Upload] Intentando subir a:', filePath);
    
    // Verificar que el bucket existe (requerido)
    console.log('📤 [Upload] Verificando buckets en Supabase Storage...');
    const { data: buckets, error: listError } = await supabaseStorage.storage.listBuckets();
    if (listError) {
      console.error('❌ [Upload] Error listando buckets:', listError);
      return res.status(500).json({ error: `Error al verificar buckets: ${listError.message}` });
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'productos');
    console.log('📤 [Upload] Buckets disponibles:', buckets?.map(b => b.name));
    console.log('📤 [Upload] Bucket "productos" existe:', bucketExists);
    
    if (!bucketExists) {
      console.log('⚠️ [Upload] Bucket "productos" no existe, creándolo...');
      const { data: newBucket, error: createError } = await supabaseStorage.storage.createBucket('productos', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
      });
      
      if (createError) {
        console.error('❌ [Upload] Error creando bucket:', createError);
        return res.status(500).json({ 
          error: `Error al crear bucket 'productos': ${createError.message}. 
          
Por favor, crea el bucket manualmente en el panel de Supabase:
1. Ve a https://supabase.com/dashboard/project/tohpxpoxcsciiojcltal/storage/buckets
2. Click en "New bucket"
3. Nombre: productos
4. Marca "Public bucket"
5. Click "Create bucket"` 
        });
      }
      console.log('✅ [Upload] Bucket "productos" creado exitosamente:', newBucket);
    }
    
    // Subir a Supabase Storage
    console.log('📤 [Upload] Subiendo archivo...');
    const { data, error } = await supabaseStorage.storage
      .from('productos')
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });
    
    if (error) {
      console.error('❌ [Upload] Error de Supabase al subir:', {
        message: error.message,
        statusCode: error.statusCode,
        name: error.name,
        details: error
      });
      throw new Error(`Error de Supabase Storage: ${error.message}`);
    }
    
    console.log('✅ [Upload] Archivo subido exitosamente:', data);
    
    // Obtener URL pública
    const publicUrlData = supabaseStorage.storage
      .from('productos')
      .getPublicUrl(filePath);
    
    const publicUrl = publicUrlData.data.publicUrl;
    console.log('✅ [Upload] URL pública generada:', publicUrl);
    
    res.status(200).json({ url: publicUrl });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('❌ [Upload] Error completo:', {
      message: errorMessage,
      error
    });
    res.status(500).json({ error: errorMessage });
  }
});

app.get('/api/config', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('site_config')
      .select('*')
     
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.status(200).json({ config: data ?? {} });
  } catch (error) {
    console.error('Error fetching config:', error);
    next(error);
  }
});

app.patch('/api/config', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const configData = req.body;
    const { error } = await supabase
      .from('site_config')
      .upsert({ ...configData, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ message: 'Config updated successfully.' });
  } catch (error) {
    console.error('Error updating config:', error);
    next(error);
  }
});

app.get('/api/gallery', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('gallery')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({ photos: data ?? [] });
  } catch (error) {
    console.error('Error fetching gallery:', error);
    next(error);
  }
});

app.post('/api/gallery', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url, label } = req.body;

    if (typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'Invalid photo URL.' });
    }

    const { data, error } = await supabase
      .from('gallery')
      .insert({ url, label: label || 'Gallery' })
      .select('id')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to add photo.');

    res.status(201).json({ id: data.id, message: 'Photo added successfully.' });
  } catch (error) {
    console.error('Error adding photo:', error);
    next(error);
  }
});

app.get('/api/orders', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.status(200).json({ orders: data ?? [] });
  } catch (error) {
    console.error('Error fetching orders:', error);
    next(error);
  }
});

app.patch('/api/orders/:orderId/status', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = getRouteParam(req.params.orderId);
    const { status } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Missing order id.' });
    }
    if (!status || !['pending', 'paid', 'failed', 'delivered'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) throw error;

    res.status(200).json({ message: 'Order status updated successfully.' });
  } catch (error) {
    console.error('Error updating order status:', error);
    next(error);
  }
});

app.post('/api/orders/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as { items?: unknown; shippingAddress?: unknown };
    const items = parseCheckoutItems(body.items);
    if (!items) {
      return res.status(400).json({ error: 'Invalid cart items.' });
    }
    if (!isShippingAddress(body.shippingAddress)) {
      return res.status(400).json({ error: 'Invalid shipping address.' });
    }

    const userId = await getOptionalUserId(req);
    const shippingAddress = normalizeShippingAddress(body.shippingAddress);

    const productIds = items.map(item => item.id);
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, name, price, stock, active')
      .in('id', productIds);

    if (productError) throw productError;

    const productMap = new Map(products.map(p => [p.id, p]));
    let total = 0;
    const orderItems: OrderItem[] = [];

    for (const item of items) {
      const product = productMap.get(item.id);
      if (!product) throw new Error(`Product ${item.id} was not found.`);
      if (!product.active) throw new Error(`Product ${product.name} is not available.`);
      if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}.`);
      
      orderItems.push({ id: product.id, name: product.name, price: product.price, quantity: item.quantity });
      total += product.price * item.quantity;
    }

    // TODO: This process should be a single atomic transaction via an RPC call.
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        items: orderItems,
        total,
        status: 'pending',
        shipping_address: shippingAddress,
        paypal_order_id: '',
      })
      .select('id')
      .single();

    if (orderError) throw orderError;
    if (!newOrder) throw new Error('Failed to create order.');

    for (const item of items) {
        const { error: stockError } = await supabase.rpc('decrement_stock', { p_id: item.id, p_quantity: item.quantity });
        if (stockError) console.error(`Stock decrement failed for product ${item.id}: ${stockError.message}`);
    }

    res.status(201).json({ orderId: newOrder.id, total, currency: PAYPAL_CURRENCY, items: orderItems });
  } catch (error) {
    next(error);
  }
});

app.post('/api/orders/capture', async (req: Request, res: Response, next: NextFunction) => {
  const body = req.body as { orderId?: unknown; paypalOrderId?: unknown };
  if (typeof body.orderId !== 'string' || typeof body.paypalOrderId !== 'string') {
    return res.status(400).json({ error: 'orderId and paypalOrderId are required.' });
  }

  const { orderId, paypalOrderId } = body;

  try {
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

    if (fetchError || !order) {
        return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.status === 'paid') {
        return res.status(200).json({ status: 'paid', orderId, paypalOrderId });
    }
    if (order.status !== 'pending') {
        return res.status(400).json({ error: 'Order cannot be captured.' });
    }
    
    const paypalCapture = await capturePayPalOrder(paypalOrderId);
    const capturedAmount = getCapturedAmount(paypalCapture);

    if (!capturedAmount || capturedAmount.currency_code !== PAYPAL_CURRENCY || toMoney(Number(capturedAmount.value)) !== toMoney(order.total)) {
        await supabase.rpc('fail_order', { p_order_id: orderId });
        return res.status(400).json({ error: 'PayPal capture failed or amount mismatch.' });
    }

    const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'paid', paypal_order_id: paypalOrderId, paid_at: new Date().toISOString() })
        .eq('id', orderId);

    if (updateError) throw updateError;
    
    await sendOrderNotificationWebhook(orderId, { ...order, status: 'paid', paypal_order_id: paypalOrderId });

    res.status(200).json({ status: 'paid', orderId, paypalOrderId, paypalCaptureId: paypalCapture.id });
  } catch (error) {
    try {
      await supabase.rpc('fail_order', { p_order_id: orderId });
    } catch (rpcError) {
      console.error('Error calling fail_order RPC:', rpcError);
    }
    next(error);
  }
});

// SPA Fallback
if (fs.existsSync(FRONTEND_INDEX_HTML)) {
  app.get(/^(?!\/api).*/, (_req: Request, res: Response) => {
    res.sendFile(FRONTEND_INDEX_HTML);
  });
}

// Error Handler global - CRÍTICO: Siempre debe enviar una respuesta HTTP válida
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error global del servidor:', error);
  
  // Asegurar que SIEMPRE se envíe una respuesta JSON válida para que el frontend no se quede colgado
  const statusCode = error instanceof Error && 'statusCode' in error 
    ? (error as Error & { statusCode: number }).statusCode 
    : 500;
  
  const message = error instanceof Error 
    ? error.message 
    : 'Error interno del servidor.';
  
  // Nunca retornar sin enviar respuesta - esto causa el loading infinito en el frontend
  res.status(statusCode).json({ 
    error: message,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Tropicana API listening on http://localhost:${PORT}`);
});
