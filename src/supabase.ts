import { createClient } from '@supabase/supabase-js';
import type { Product, Order, SiteConfig, GalleryPhoto } from './types.js';

// Variables de entorno para Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ─── Productos ───────────────────────────────────────────────────────────────

/**
 * Obtiene todos los productos activos del catálogo.
 */
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .or('active.eq.true,active.is.null')
    .order('name', { ascending: true });

  if (error) throw new Error(`Error fetching products: ${error.message}`);
  return (data ?? []).map(mapProduct);
}

/**
 * Obtiene un producto por su ID.
 */
export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data ? mapProduct(data) : null;
}

/**
 * Suscripción en tiempo real a cambios en productos.
 */
export function subscribeToProducts(
  callback: (products: Product[]) => void,
  onError?: (error: Error) => void,
) {
  // Carga inicial
  getProducts()
    .then(callback)
    .catch((err) => onError?.(err));

  // Suscripción en tiempo real
  const subscription = supabase
    .channel('products-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products' },
      async () => {
        try {
          const products = await getProducts();
          callback(products);
        } catch (err) {
          onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      },
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Crea un nuevo producto (solo admin).
 */
export async function createProduct(
  product: Omit<Product, 'id'>,
  accessToken: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: product.name,
      description: product.description,
      price: product.price,
      volume: product.volume,
      image: product.image,
      category: product.category,
      stock: product.stock,
      active: product.active ?? true,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Error creating product: ${error.message}`);
  return data!.id;
}

/**
 * Actualiza un producto existente (solo admin).
 */
export async function updateProduct(
  id: string,
  product: Partial<Omit<Product, 'id'>>,
  accessToken: string,
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({
      ...product,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(`Error updating product: ${error.message}`);
}

/**
 * Archiva un producto (soft delete) (solo admin).
 */
export async function archiveProduct(
  id: string,
  accessToken: string,
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Error archiving product: ${error.message}`);
}

// ─── Configuración del Sitio ─────────────────────────────────────────────────

/**
 * Obtiene la configuración del sitio.
 */
export async function getSiteConfig(): Promise<SiteConfig | null> {
  const { data, error } = await supabase
    .from('site_config')
    .select('*')
    .eq('id', 'site')
    .single();

  if (error) return null;
  return data ? mapSiteConfig(data) : null;
}

/**
 * Actualiza la configuración del sitio (solo admin).
 */
export async function updateSiteConfig(
  config: Partial<SiteConfig>,
  accessToken: string,
): Promise<void> {
  const { error } = await supabase
    .from('site_config')
    .upsert({ id: 'site', ...config, updated_at: new Date().toISOString() });

  if (error) throw new Error(`Error updating site config: ${error.message}`);
}

// ─── Órdenes ─────────────────────────────────────────────────────────────────

/**
 * Crea una nueva orden.
 */
export async function createOrder(order: {
  userId: string | 'guest';
  items: { id: string; name: string; price: number; quantity: number }[];
  total: number;
  shippingAddress: {
    name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
  };
  paypalOrderId: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: order.userId,
      items: order.items,
      total: order.total,
      status: 'pending',
      shipping_address: order.shippingAddress,
      paypal_order_id: order.paypalOrderId,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Error creating order: ${error.message}`);
  return data!.id;
}

/**
 * Obtiene órdenes (admin: todas, usuario: propias).
 */
export async function getOrders(
  accessToken?: string,
  statusFilter?: string,
): Promise<Order[]> {
  let query = supabase.from('orders').select('*');

  if (statusFilter && ['pending', 'paid', 'failed', 'delivered'].includes(statusFilter)) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(100);

  if (error) throw new Error(`Error fetching orders: ${error.message}`);
  return (data ?? []).map(mapOrder);
}

/**
 * Actualiza el estado de una orden (solo admin).
 */
export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'paid' | 'failed' | 'delivered',
  accessToken: string,
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'paid') updateData.paid_at = new Date().toISOString();
  if (status === 'failed') updateData.failed_at = new Date().toISOString();

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId);

  if (error) throw new Error(`Error updating order status: ${error.message}`);
}

// ─── Galería de Fotos ────────────────────────────────────────────────────────

/**
 * Agrega una foto a la galería (solo admin).
 */
export async function addGalleryPhoto(
  url: string,
  label: string,
  accessToken: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('gallery_photos')
    .insert({ url, label })
    .select('id')
    .single();

  if (error) throw new Error(`Error adding photo: ${error.message}`);
  return data!.id;
}

/**
 * Obtiene todas las fotos de la galería.
 */
export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  const { data, error } = await supabase
    .from('gallery_photos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Error fetching gallery: ${error.message}`);
  return (data ?? []).map(mapGalleryPhoto);
}

// ─── Funciones de mapeo ──────────────────────────────────────────────────────

function mapProduct(data: Record<string, unknown>): Product {
  return {
    id: data.id as string,
    name: data.name as string,
    description: (data.description as string) ?? '',
    price: Number(data.price),
    volume: (data.volume as string) ?? '750ml',
    image: (data.image as string) ?? '',
    category: data.category as 'licor' | 'torito',
    stock: Number(data.stock) ?? 0,
    active: data.active !== false,
  };
}

function mapOrder(data: Record<string, unknown>): Order {
  return {
    id: data.id as string,
    userId: (data.user_id as string) ?? 'guest',
    items: Array.isArray(data.items) ? data.items : [],
    total: Number(data.total),
    status: (data.status as Order['status']) ?? 'pending',
    shippingAddress: (data.shipping_address as Order['shippingAddress']) ?? {
      name: '',
      email: '',
      phone: '',
      street: '',
      city: '',
    },
    paypalOrderId: (data.paypal_order_id as string) ?? '',
    createdAt: (data.created_at as string) ?? new Date().toISOString(),
  };
}

function mapSiteConfig(data: Record<string, unknown>): SiteConfig {
  return {
    heroSlides: [],
    introTitle: (data.hero_title as string) ?? '',
    introText: (data.intro_text as string) ?? '',
    videoTitle: (data.video_title as string) ?? '',
    videoSubtitle: (data.video_subtitle as string) ?? '',
    videoImage: (data.video_image as string) ?? '',
    licoresHeaderImage: (data.licores_header_image as string) ?? '',
    toritosHeaderImage: (data.toritos_header_image as string) ?? '',
    contactPhone: (data.contact_phone as string) ?? '',
    footerText: (data.footer_text as string) ?? '',
  };
}

function mapGalleryPhoto(data: Record<string, unknown>): GalleryPhoto {
  return {
    id: data.id as string,
    url: data.url as string,
    label: (data.label as string) ?? '',
    createdAt: (data.created_at as string) ?? new Date().toISOString(),
  };
}