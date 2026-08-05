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
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

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
let auth: Auth;
let serviceInitializationError: Error | null = null;

function initializeServices(): { supabase: SupabaseClient; auth: Auth } | { error: Error } {
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
    
    return { supabase: supabaseClient, auth };
  } catch (error) {
    const initError = error instanceof Error ? error : new Error('Supabase Admin client failed to initialize.');
    return { error: initError };
  }
}

const result = initializeServices();

if ('error' in result) {
  serviceInitializationError = result.error;
} else {
  supabase = result.supabase;
  auth = result.auth;
}

// --- FIN: SECCIÓN DE INICIALIZACIÓN DE FIREBASE REFACTORIZADA ---

const app = express();
app.disable('x-powered-by');
const PORT = Number(process.env.PORT || 9005);
const ADMIN_UID = process.env.ADMIN_UID || process.env.FIREBASE_ADMIN_UID;
if (!ADMIN_UID) {
  console.warn('⚠️ No se ha configurado ningún UID de administrador. Define ADMIN_UID o FIREBASE_ADMIN_UID en tu entorno.');
}
const PAYPAL_MODE = process.env.PAYPAL_MODE?.toLowerCase() === 'live' ? 'live' : 'sandbox';
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

app.use(express.json({ limit: '5mb' }));

// Rate Limiter para proteger contra ataques de fuerza bruta y DoS
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutos
	max: 100, // Limita cada IP a 100 peticiones por `windowMs`
	standardHeaders: true, // Devuelve la información del rate limit en las cabeceras `RateLimit-*`
	legacyHeaders: false, // Deshabilita las cabeceras `X-RateLimit-*`
  message: { error: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo en 15 minutos.' },
});

// Aplicar el rate limiter a todas las rutas de la API
app.use('/api/', apiLimiter);

if (fs.existsSync(FRONTEND_INDEX_HTML)) {
  app.use(express.static(FRONTEND_DIST_DIR));
}

// --- Zod Schemas for Validation ---
const ProductPayloadSchema = z.object({
  name: z.string().trim().min(1, { message: 'El nombre es requerido.' }),
  description: z.string().trim().min(1, { message: 'La descripción es requerida.' }),
  price: z.number().positive({ message: 'El precio debe ser un número positivo.' }),
  volume: z.string().trim().min(1, { message: 'El volumen es requerido.' }),
  image: z.string().url({ message: 'La URL de la imagen no es válida.' }),
  category: z.enum(['licor', 'torito']),
  stock: z.number().int().min(0, { message: 'El stock no puede ser negativo.' }),
  active: z.boolean().optional().default(true),
  gallery: z.array(z.string().url()).optional(),
});

// By adding .strip(), we ensure that any unknown properties (like a stray `updated_at`
// sent from the client) are removed before being passed to the database.
const ProductUpdatePayloadSchema = ProductPayloadSchema.partial().strip();

const CheckoutItemSchema = z.object({
  id: z.string().uuid('ID de producto inválido.'),
  quantity: z.number().int().positive('La cantidad debe ser un entero positivo.'),
});

const ShippingAddressSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido.'),
  email: z.string().email('El email no es válido.'),
  phone: z.string().trim().min(1, 'El teléfono es requerido.'),
  street: z.string().trim().min(1, 'La calle y número son requeridos.'),
  city: z.string().trim().min(1, 'La ciudad es requerida.'),
});

const CreateOrderSchema = z.object({
  items: z.array(CheckoutItemSchema).min(1, 'El carrito no puede estar vacío.'),
  shippingAddress: ShippingAddressSchema,
  discoverySource: z.enum(['social_media', 'friend_recommendation', 'google_search', 'physical_location', 'other']).optional(),
});

function normalizeShippingAddress(address: ShippingAddress): ShippingAddress {
  return {
    name: normalizeString(address.name),
    email: normalizeString(address.email),
    phone: normalizeString(address.phone),
    street: normalizeString(address.street),
    city: normalizeString(address.city),
  };
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

interface PayPalToken {
  access_token: string;
  expires_at: number;
}

let paypalToken: PayPalToken | null = null;

async function getPayPalAccessToken(): Promise<string> {
  if (paypalToken && Date.now() < paypalToken.expires_at) {
    return paypalToken.access_token;
  }

  console.log('🔐 [PayPal] Fetching new access token...');
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing PayPal client ID or secret.');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const url = `${PAYPAL_API_BASE}/v1/oauth2/token`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('❌ [PayPal] Failed to get access token:', errorBody);
    throw new Error(`PayPal token fetch failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  const bufferSeconds = 300; // 5 minutes buffer
  paypalToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - bufferSeconds) * 1000,
  };

  console.log('✅ [PayPal] New access token obtained.');
  return paypalToken.access_token;
}

async function capturePayPalOrder(paypalOrderId: string): Promise<PayPalCaptureResponse> {
  console.log('🔐 [PayPal] Iniciando captura de orden:', paypalOrderId);
  const accessToken = await getPayPalAccessToken();
  const url = `${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error('❌ [PayPal] Capture failed:', { status: response.status, body: responseText });
    throw new Error(`PayPal capture failed: ${response.status} - ${responseText}`);
  }

  return JSON.parse(responseText) as PayPalCaptureResponse;
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

    if (error) throw new Error(error.message);

    res.status(200).json({ products: data ?? [] });
  } catch (error) {
    console.error('Error fetching products:', error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

// Endpoint para crear un nuevo producto
app.post('/api/products', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = ProductPayloadSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Datos de producto inválidos.', details: validationResult.error.flatten() });
    }
    const productData = validationResult.data;

    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Failed to create product, no data returned.');

    res.status(201).json({ id: data.id, message: 'Product created successfully.' });
  } catch (error) {
    console.error('Error creating product:', error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

// Endpoint para actualizar un producto existente
app.patch('/api/products/:productId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = getRouteParam(req.params.productId);
    if (!productId) {
      return res.status(400).json({ error: 'Missing product id.' });
    }

    const validationResult = ProductUpdatePayloadSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Datos de actualización inválidos.', details: validationResult.error.flatten() });
    }
    const productUpdateData = validationResult.data;

    if (Object.keys(productUpdateData).length === 0) {
      return res.status(400).json({ error: 'No update data provided.' });
    }

    const { error } = await supabase
      .from('products')
      .update(productUpdateData)
      .eq('id', productId);

    if (error) throw new Error(error.message);

    res.status(200).json({ status: 'updated', message: 'Product updated successfully.' });
  } catch (error) {
    console.error('Error updating product:', error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

function getPathFromUrl(fileUrl: string): string | null {
  if (!fileUrl) return null;
  try {
    const url = new URL(fileUrl);
    // Example pathname: /storage/v1/object/public/productos/12345-file.jpg
    // We need to extract the path after the bucket name.
    const pathSegments = url.pathname.split('/');
    const bucketNameIndex = pathSegments.indexOf('productos');
    if (bucketNameIndex === -1 || bucketNameIndex + 1 >= pathSegments.length) {
      return null;
    }
    return pathSegments.slice(bucketNameIndex + 1).join('/');
  } catch (e) {
    console.error(`[Delete Helper] Invalid URL provided: ${fileUrl}`);
    return null;
  }
}

app.delete('/api/products/:productId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = getRouteParam(req.params.productId);
    if (!productId) {
      return res.status(400).json({ error: 'Missing product id.' });
    }

    // 1. Get the product to find associated files
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('image, gallery')
      .eq('id', productId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = row not found
      throw new Error(`Error fetching product for deletion: ${fetchError.message}`);
    }

    // 2. Delete the record from the database
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) throw new Error(error.message);

    // 3. If DB deletion was successful and we found a product, delete files from storage
    if (product) {
      const filesToDelete: string[] = [];
      
      const mainImage = getPathFromUrl(product.image);
      if (mainImage) filesToDelete.push(mainImage);

      if (Array.isArray(product.gallery)) {
        product.gallery.forEach((fileUrl: string) => {
          const galleryFile = getPathFromUrl(fileUrl as string);
          if (galleryFile) filesToDelete.push(galleryFile);
        });
      }

      if (filesToDelete.length > 0) {
        console.log(`[Delete Product] Deleting ${filesToDelete.length} files from storage for product ${productId}`, filesToDelete);
        const { error: storageError } = await supabase.storage.from('productos').remove(filesToDelete);
        if (storageError) {
          // Log the error but don't fail the request, as the DB record is already gone.
          console.error(`[Delete Product] Failed to delete files from storage, but DB record was removed. Files: ${filesToDelete.join(', ')}`, storageError);
        }
      }
    }

    res.status(200).json({ status: 'deleted', message: 'Product deleted successfully.' });
  } catch (error) {
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

// Endpoint para subir imágenes a Supabase Storage
app.post('/api/upload/media', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageBase64, fileName, contentType } = req.body;
    
    console.log('📤 [Upload] Recibida solicitud de subida:', {
      hasImageBase64: !!imageBase64,
      hasFileName: !!fileName,
      fileName,
      imageBase64Length: imageBase64?.length || 0,
      contentType,
    });
    
    if (!imageBase64 || !fileName) {
      return res.status(400).json({ error: 'Se requiere imageBase64 y fileName' });
    }
    
    // Convertir base64 a buffer
    const base64Marker = ';base64,';
    const base64Index = imageBase64.indexOf(base64Marker);
    if (base64Index === -1) {
      return res.status(400).json({ error: 'Formato de data URL inválido. No se encontró ";base64,".' });
    }
    const buffer = Buffer.from(imageBase64.substring(base64Index + base64Marker.length), 'base64');
    
    console.log('📤 [Upload] Buffer creado:', {
      bufferSize: buffer.length,
      bufferSizeKB: (buffer.length / 1024).toFixed(2)
    });
    
    // Generar nombre único para el archivo
    const fileExtension = path.extname(fileName) || '.media';
    const baseName = path.basename(fileName, fileExtension);
    const timestamp = Date.now();
    const safeFileName = `${timestamp}-${baseName.replace(/[^a-zA-Z0-9_-]/g, '-')}${fileExtension}`;
    const filePath = `productos/${safeFileName}`;
    
    console.log('📤 [Upload] Intentando subir a:', filePath);
    
    // Verificar que el bucket existe (requerido)
    console.log('📤 [Upload] Verificando buckets en Supabase Storage...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error('❌ [Upload] Error listando buckets:', listError);
      return res.status(500).json({ error: `Error al verificar buckets: ${listError.message}` });
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'productos');
    console.log('📤 [Upload] Buckets disponibles:', buckets?.map(b => b.name));
    console.log('📤 [Upload] Bucket "productos" existe:', bucketExists);
    
    if (!bucketExists) {
      console.log('⚠️ [Upload] Bucket "productos" no existe, creándolo...');
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('productos', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
      });
      
      if (createError) {
        console.error('❌ [Upload] Error creando bucket:', createError);
        return res.status(500).json({ 
          error: `Error al crear bucket 'productos': ${createError.message}. 
          
Por favor, crea el bucket manualmente en el panel de Supabase:
1. Ve a ${process.env.SUPABASE_URL?.replace('/rest/v1', '') || 'tu panel de Supabase'}/storage/buckets
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
    const { data, error } = await supabase.storage
      .from('productos')
      .upload(filePath, buffer, {
        contentType: contentType || 'application/octet-stream',
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
    const publicUrlData = supabase.storage
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
    // Lista de campos permitidos en site_config (solo los que existen en la tabla)
    const allowedFields = [
      'hero_title',
      'hero_subtitle',
      'logo_url',
      'welcome_message',
      'intro_title',
      'intro_text',
      'video_title',
      'video_subtitle',
      'video_image',
      'licores_header_image',
      'toritos_header_image',
      'contact_phone',
      'footer_text',
      'visit_count',
    ];

    // Filtrar solo los campos permitidos y remover valores undefined/null
    const configData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (allowedFields.includes(key) && value !== undefined && value !== null && value !== '') {
        configData[key] = value;
      }
    }

    // Si no hay datos válidos para actualizar, retornar éxito sin hacer la consulta
    if (Object.keys(configData).length === 0) {
      return res.status(200).json({ message: 'No changes to save.' });
    }

    const { error } = await supabase
      .from('site_config')
      .upsert(configData)
      .select()
      .single();

    if (error) {
      // Log detallado del error para debugging
      console.error('❌ [Config Update] Error de Supabase:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        configData,
      });
      
      // Mensaje de error más amigable
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        throw new Error(`Error: La columna "${error.message.match(/column "([^"]+)"/)?.[1] || 'desconocida'}" no existe en la tabla. Por favor ejecuta la migración SQL.`);
      }
      
      throw new Error(error.message);
    }

    res.status(200).json({ message: 'Config updated successfully.' });
  } catch (error) {
    console.error('Error updating config:', error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

app.get('/api/gallery', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('gallery_photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const photos = data ?? [];
    
    // Log detallado para debugging
    console.log('[Gallery API] Photos fetched:', {
      count: photos.length,
      photos: photos.map(p => ({
        id: p.id,
        url: p.url,
        label: p.label,
        mediaType: p.media_type,
        createdAt: p.created_at,
      })),
    });

    res.status(200).json({ photos });
  } catch (error) {
    console.error('Error fetching gallery:', error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

app.post('/api/gallery', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url, label } = req.body;

    if (typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'Invalid photo URL.' });
    }

    const { data, error } = await supabase
      .from('gallery_photos')
      .insert({ url, label: label || 'Gallery' })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Failed to add photo.');

    res.status(201).json({ id: data.id, message: 'Photo added successfully.' });
  } catch (error) {
    console.error('Error adding photo:', error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

app.delete('/api/gallery/:photoId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const photoId = getRouteParam(req.params.photoId);
    if (!photoId) {
      return res.status(400).json({ error: 'Missing photo id.' });
    }

    // 1. Get the photo URL from the database before deleting the record
    const { data: photo, error: fetchError } = await supabase
      .from('gallery_photos')
      .select('url')
      .eq('id', photoId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = row not found
        throw new Error(fetchError.message);
    }

    // 2. Delete the record from the database
    const { error: deleteError } = await supabase
      .from('gallery_photos')
      .delete()
      .eq('id', photoId);

    if (deleteError) throw new Error(deleteError.message);

    // 3. If DB deletion was successful and we found a photo, delete from storage
    if (photo?.url) {
      try {
        const url = new URL(photo.url);
        const pathToRemove = getPathFromUrl(photo.url);
        if (pathToRemove) {
          console.log(`[Delete Gallery] Deleting from storage: productos/${pathToRemove}`);
          // The path from getPathFromUrl is already relative to the bucket
          await supabase.storage.from('productos').remove([pathToRemove]);
        }
      } catch (storageError) {
        // Log the error but don't fail the request, as the DB record is already gone.
        console.error(`[Delete Gallery] Failed to delete file from storage, but DB record was removed: ${photo.url}`, storageError);
      }
    }

    res.status(200).json({ status: 'deleted', message: 'Photo deleted successfully.' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    next(error instanceof Error ? error : new Error(String(error)));
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

    if (error) throw new Error(error.message);

    res.status(200).json({ orders: data ?? [] });
  } catch (error) {
    console.error('Error fetching orders:', error);
    next(error instanceof Error ? error : new Error(String(error)));
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
      .update({ status })
      .eq('id', orderId);

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Order status updated successfully.' });
  } catch (error) {
    console.error('Error updating order status:', error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

app.post('/api/orders/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('📝 [Checkout] Iniciando creación de orden...');
    
    const validationResult = CreateOrderSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error('❌ [Checkout] Invalid body:', validationResult.error.flatten());
      return res.status(400).json({ error: 'Datos de la orden inválidos.', details: validationResult.error.flatten() });
    }
    
    const { items, shippingAddress: rawShippingAddress, discoverySource } = validationResult.data;

    const userId = await getOptionalUserId(req);
    console.log('📝 [Checkout] User ID:', userId);

    const shippingAddress = normalizeShippingAddress(rawShippingAddress);
    console.log('📝 [Checkout] Dirección normalizada:', shippingAddress);

    const productIds = items.map(item => item.id);
    console.log('📝 [Checkout] Consultando productos:', productIds);

    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, name, price, stock, active')
      .in('id', productIds);

    if (productError) {
      console.error('❌ [Checkout] Error fetching products:', productError);
      throw new Error(productError.message);
    }

    console.log('📝 [Checkout] Productos encontrados:', products?.length || 0);

    const productMap = new Map(products.map(p => [p.id, p]));
    let total = 0;
    const orderItems: OrderItem[] = [];

    for (const item of items) {
      const product = productMap.get(item.id);
      if (!product) {
        console.error(`❌ [Checkout] Product ${item.id} not found`);
        throw new Error(`Product ${item.id} was not found.`);
      }
      if (!product.active) {
        console.error(`❌ [Checkout] Product ${product.name} is not active`);
        throw new Error(`Product ${product.name} is not available.`);
      }
      if (product.stock < item.quantity) {
        console.error(`❌ [Checkout] Insufficient stock for ${product.name}: ${product.stock} < ${item.quantity}`);
        throw new Error(`Insufficient stock for ${product.name}.`);
      }
      
      orderItems.push({ id: product.id, name: product.name, price: product.price, quantity: item.quantity });
      total += product.price * item.quantity;
    }

    console.log('📝 [Checkout] Total calculado:', total);
    console.log('📝 [Checkout] Items de la orden:', orderItems);

    // Llamada a la función RPC de Supabase para una transacción atómica.
    // Esto asegura que la creación de la orden y la actualización del stock ocurran juntas.
    // O todo tiene éxito, o todo falla, evitando inconsistencias en los datos.
    console.log('📝 [Checkout] Ejecutando RPC `create_order_and_decrement_stock`...');
    const { data: newOrder, error: rpcError } = await supabase.rpc('create_order_and_decrement_stock', {
      p_user_id: userId,
      p_items: orderItems, // El RPC solo usará 'id' y 'quantity' de este array
      p_total: total,
      p_shipping_address: shippingAddress,
      p_discovery_source: discoverySource || null,
    })
      .select('id')
      .single();

    if (rpcError) {
      console.error('❌ [Checkout] Error en RPC `create_order_and_decrement_stock`:', {
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        code: rpcError.code,
      });
      // El error de la función de base de datos puede ser más específico, como "insufficient_stock"
      throw new Error(rpcError.message || 'Error al procesar la orden en la base de datos.');
    }

    if (!newOrder || !newOrder.id) {
      console.error('❌ [Checkout] RPC ejecutado pero no retornó un ID de orden.');
      throw new Error('Failed to create order.');
    }

    console.log('✅ [Checkout] Orden creada exitosamente:', newOrder.id);

    console.log('✅ [Checkout] Orden lista para pago:', { orderId: newOrder.id, total, currency: PAYPAL_CURRENCY, items: orderItems });
    res.status(201).json({ orderId: newOrder.id, total, currency: PAYPAL_CURRENCY, items: orderItems });
  } catch (error) {
    console.error('❌ [Checkout] Error completo en creación de orden:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    });
    next(error);
  }
});

app.post('/api/orders/capture', async (req: Request, res: Response, next: NextFunction) => {
  const body = req.body as { orderId?: unknown; paypalOrderId?: unknown };
  
  console.log('💳 [Capture] Iniciando captura de pago PayPal...');
  
  if (typeof body.orderId !== 'string' || typeof body.paypalOrderId !== 'string') {
    console.error('❌ [Capture] Invalid request body:', body);
    return res.status(400).json({ error: 'orderId and paypalOrderId are required.' });
  }

  const { orderId, paypalOrderId } = body;
  console.log('💳 [Capture] Datos recibidos:', { orderId, paypalOrderId });

  try {
    console.log('💳 [Capture] Buscando orden en Supabase:', orderId);
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

    if (fetchError) {
        console.error('❌ [Capture] Error fetching order:', fetchError);
        throw new Error(fetchError.message);
    }
    if (!order) {
        return res.status(404).json({ error: 'Order not found.' });
    }

    console.log('💳 [Capture] Orden encontrada:', { 
      id: order.id, 
      status: order.status, 
      total: order.total,
      currency: PAYPAL_CURRENCY 
    });

    if (order.status === 'paid') {
        console.log('⚠️ [Capture] Order already paid');
        return res.status(200).json({ status: 'paid', orderId, paypalOrderId });
    }
    if (order.status !== 'pending') {
        console.error('❌ [Capture] Order cannot be captured, status:', order.status);
        return res.status(400).json({ error: 'Order cannot be captured.' });
    }

    console.log('💳 [Capture] Capturando pago en PayPal:', paypalOrderId);
    const paypalCapture = await capturePayPalOrder(paypalOrderId);
    const capturedAmount = getCapturedAmount(paypalCapture);

    console.log('💳 [Capture] Monto capturado:', capturedAmount);
    console.log('💳 [Capture] Comparando:', {
      captured: capturedAmount,
      expectedCurrency: PAYPAL_CURRENCY,
      expectedTotal: order.total,
      capturedValue: capturedAmount?.value,
      capturedCurrency: capturedAmount?.currency_code
    });

    const amountMatch = toMoney(Number(capturedAmount?.value)) === toMoney(order.total);
    const currencyMatch = capturedAmount?.currency_code === PAYPAL_CURRENCY;

    if (!capturedAmount || !currencyMatch || !amountMatch) {
        console.error('❌ [Capture] Amount mismatch or invalid capture:', {
          capturedAmount,
          expectedCurrency: PAYPAL_CURRENCY,
          expectedTotal: order.total,
          currencyMatch,
          amountMatch
        });
        await supabase.rpc('fail_order', { p_order_id: orderId });
        return res.status(400).json({ error: 'PayPal capture failed or amount mismatch.' });
    }

    console.log('✅ [Capture] Monto validado, actualizando orden a paid');
    const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'paid', paypal_order_id: paypalOrderId, paid_at: new Date().toISOString() })
        .eq('id', orderId);

    if (updateError) {
      console.error('❌ [Capture] Error updating order status:', updateError);
      throw new Error(updateError.message);
    }
    
    console.log('✅ [Capture] Orden actualizada a paid, enviando notificación');
    await sendOrderNotificationWebhook(orderId, { ...order, status: 'paid', paypal_order_id: paypalOrderId });

    console.log('✅ [Capture] Pago completado exitosamente');
    res.status(200).json({ status: 'paid', orderId, paypalOrderId, paypalCaptureId: paypalCapture.id });
  } catch (error) {
    console.error('❌ [Capture] Error completo en captura:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    });
    
    try {
      console.log('⚠️ [Capture] Marcando orden como fallida:', orderId);
      await supabase.rpc('fail_order', { p_order_id: orderId });
    } catch (rpcError) {
      console.error('❌ [Capture] Error calling fail_order RPC:', rpcError);
    }
    next(error);
  }
});

// ─── Rastreo de Visitas ──────────────────────────────────────────────────────

app.post('/api/stats/visit', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Incrementar el contador de visitas de forma atómica usando SQL directo
    const { data, error } = await supabase.rpc('increment_visit_count');
    
    if (error) {
      console.error('Error incrementing visit count:', error);
      // Si la función RPC no existe, usar método alternativo
      const { data: configData, error: fetchError } = await supabase
        .from('site_config')
        .select('visit_count')
        .single();
      
      if (fetchError && fetchError.code === 'PGRST116') {
        // No existe el registro, crearlo
        const { data: newConfig, error: insertError } = await supabase
          .from('site_config')
          .insert({ visit_count: 1 })
          .select('visit_count')
          .single();

        if (insertError) {
          console.error('Error creating site config:', insertError);
          throw insertError;
        }

        return res.status(200).json({ visitCount: newConfig?.visit_count || 1 });
      }
      
      throw error;
    }
    
    res.status(200).json({ visitCount: data || 0 });
  } catch (error) {
    console.error('Error in /api/stats/visit:', error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

app.get('/api/stats/visit', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Obtener el contador actual sin incrementar
    const { data, error } = await supabase
      .from('site_config')
      .select('visit_count')
      .single();

    if (error) {
      console.error('Error fetching visit count:', error);
      return res.status(200).json({ visitCount: 0 });
    }

    res.status(200).json({ visitCount: data?.visit_count || 0 });
  } catch (error) {
    console.error('Error in /api/stats/visit GET:', error);
    res.status(200).json({ visitCount: 0 });
  }
});

// ─── Distribuidores (B2B Leads) ──────────────────────────────────────────────

// Schema de validación para leads de distribuidores
const DistributorLeadSchema = z.object({
  full_name: z.string().trim().min(1, 'El nombre es requerido.'),
  phone: z.string().trim().min(1, 'El teléfono es requerido.'),
  email: z.string().email('El email no es válido.'),
  city_state: z.string().trim().min(1, 'La ciudad/estado es requerida.'),
  business_name: z.string().trim().optional(),
  message: z.string().trim().optional(),
});

app.post('/api/distributors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = DistributorLeadSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Datos inválidos.', details: validationResult.error.flatten() });
    }

    const leadData = {
      ...validationResult.data,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('distributors_leads')
      .insert([leadData])
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Failed to create distributor lead.');

    res.status(201).json({ id: data.id, message: 'Lead created successfully.' });
  } catch (error) {
    console.error('Error creating distributor lead:', error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

app.get('/api/distributors', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    let query = supabase.from('distributors_leads').select('*').order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    res.status(200).json({ leads: data ?? [] });
  } catch (error) {
    console.error('Error fetching distributor leads:', error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

app.patch('/api/distributors/:leadId/status', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leadId = getRouteParam(req.params.leadId);
    const { status } = req.body;

    if (!leadId) {
      return res.status(400).json({ error: 'Missing lead id.' });
    }

    const validStatuses = ['pending', 'contacted', 'qualified', 'converted', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const { error } = await supabase
      .from('distributors_leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', leadId);

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Lead status updated successfully.' });
  } catch (error) {
    console.error('Error updating distributor lead status:', error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

app.delete('/api/distributors/:leadId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leadId = getRouteParam(req.params.leadId);
    if (!leadId) {
      return res.status(400).json({ error: 'Missing lead id.' });
    }

    const { error } = await supabase
      .from('distributors_leads')
      .delete()
      .eq('id', leadId);

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Lead deleted successfully.' });
  } catch (error) {
    console.error('Error deleting distributor lead:', error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

// ─── Chat de Atención a Clientes ─────────────────────────────────────────────

// Schema de validación para mensajes de chat
const ChatMessageSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido.'),
  email: z.string().email('El email no es válido.').optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  message: z.string().trim().min(1, 'El mensaje es requerido.'),
});

app.post('/api/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = ChatMessageSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Datos inválidos.', details: validationResult.error.flatten() });
    }

    const messageData = {
      name: validationResult.data.name,
      email: validationResult.data.email || null,
      phone: validationResult.data.phone || null,
      message: validationResult.data.message,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('chat_messages')
      .insert([messageData])
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Failed to create chat message.');

    res.status(201).json({ id: data.id, message: 'Chat message created successfully.' });
  } catch (error) {
    console.error('Error creating chat message:', error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

app.get('/api/chat', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    let query = supabase.from('chat_messages').select('*').order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    res.status(200).json({ messages: data ?? [] });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

app.patch('/api/chat/:messageId/answer', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messageId = getRouteParam(req.params.messageId);
    const { answer } = req.body;

    if (!messageId) {
      return res.status(400).json({ error: 'Missing message id.' });
    }

    if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
      return res.status(400).json({ error: 'Answer is required.' });
    }

    const { error } = await supabase
      .from('chat_messages')
      .update({
        answer: answer.trim(),
        status: 'answered',
        answered_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Chat message answered successfully.' });
  } catch (error) {
    console.error('Error answering chat message:', error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

app.patch('/api/chat/:messageId/status', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messageId = getRouteParam(req.params.messageId);
    const { status } = req.body;

    if (!messageId) {
      return res.status(400).json({ error: 'Missing message id.' });
    }

    const validStatuses = ['pending', 'answered', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const { error } = await supabase
      .from('chat_messages')
      .update({ status })
      .eq('id', messageId);

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Chat message status updated successfully.' });
  } catch (error) {
    console.error('Error updating chat message status:', error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

// ─── Estadísticas ─────────────────────────────────────────────────────────────

app.get('/api/stats', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Obtener todos los pedidos
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, total, created_at');

    if (ordersError) throw new Error(ordersError.message);

    // 2. Obtener todos los productos
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, stock, active');

    if (productsError) throw new Error(productsError.message);

    // 3. Obtener configuración del sitio para contador de visitas
    const { data: siteConfig, error: configError } = await supabase
      .from('site_config')
      .select('visit_count')
      .single();

    if (configError && configError.code !== 'PGRST116') {
      console.error('Error fetching site config for stats:', configError);
    }

    // Calcular métricas
    const totalOrders = orders?.length || 0;
    const completedOrders = orders?.filter(o => o.status === 'paid' || o.status === 'delivered').length || 0;
    const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
    const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;

    // Producto más vendido (basado en items de órdenes completadas)
    const completedOrdersData = orders?.filter(o => o.status === 'paid' || o.status === 'delivered') || [];
    const productSalesMap = new Map<string, { name: string; quantity: number }>();
    
    for (const order of completedOrdersData) {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity, product_name')
        .eq('order_id', order.id);

      if (orderItems) {
        for (const item of orderItems) {
          const current = productSalesMap.get(item.product_id) || { name: item.product_name, quantity: 0 };
          current.quantity += item.quantity;
          productSalesMap.set(item.product_id, current);
        }
      }
    }

    // Encontrar el producto más vendido
    let topProduct = { name: 'N/A', quantity: 0 };
    for (const [productId, data] of productSalesMap.entries()) {
      if (data.quantity > topProduct.quantity) {
        topProduct = { name: data.name, quantity: data.quantity };
      }
    }

    // Productos activos y stock bajo
    const activeProducts = products?.filter(p => p.active !== false).length || 0;
    const lowStockProducts = products?.filter(p => p.active !== false && p.stock <= 3).length || 0;

    res.status(200).json({
      totalRevenue,
      totalOrders,
      completedOrders,
      pendingOrders,
      visitCount: siteConfig?.visit_count || 0,
      topProduct,
      activeProducts,
      lowStockProducts,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    next(error instanceof Error ? error : new Error(String(error)));
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
  // Log completo para depuración
  console.error('❌ Error global del servidor:', {
    message: error instanceof Error ? error.message : 'Error desconocido',
    stack: error instanceof Error ? error.stack : 'No stack available',
    errorObject: JSON.stringify(error, null, 2)
  });
  
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
