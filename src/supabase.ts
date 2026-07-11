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

/**
 * Configuración mejorada de Supabase con:
 * - Auto-refresco de tokens
 * - Persistencia de sesión
 * - Detección de sesión en URL
 * - Realtime con reconexion automática
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    // Configuración de Realtime para evitar idle_shutdown
    params: {
      eventsPerSecond: 10, // Permitir hasta 10 eventos por segundo
    },
  },
});

// ─── Productos ───────────────────────────────────────────────────────────────


/**
 * Mantiene vivo el tenant de Supabase escuchando cambios en la tabla 'productos'.
 * Esto previene que el tenant se cierre por idle_shutdown cuando no hay usuarios
 * escuchando activamente el canal de Realtime.
 * 
 * @returns Una función para desuscribirse del canal
 */
export function subscribeToRealtimeKeepAlive(): (() => void) {
  console.log('[Realtime KeepAlive] Inicializando suscripción persistente al canal de productos...');
  
  // Crear canal 'admin-products' para escuchar cambios en la tabla productos
  const channel = supabase.channel('admin-products-keep-alive', {
    config: {
      // Permitir que este canal se mantenga activo incluso sin subscriptores explícitos
      broadcast: { ack: true },
      presence: { key: 'keep-alive' },
    },
  });

  // Escuchar cambios en la tabla 'productos' para mantener viva la conexión
  channel
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products' },
      (payload) => {
        console.log('[Realtime KeepAlive] Cambio detectado en productos:', payload.eventType);
      }
    )
    .on('presence', { event: 'sync' }, () => {
      console.log('[Realtime KeepAlive] Presencia sincronizada - tenant activo');
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log(`[Realtime KeepAlive] Usuario unido al canal: ${key}`);
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log(`[Realtime KeepAlive] Usuario salió del canal: ${key}`);
    })
    .subscribe(async (status, err) => {
      if (err) {
        console.error('[Realtime KeepAlive] Error en suscripción:', err);
        return;
      }
      
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime KeepAlive] Canal activo - transmitiendo presencia');
        // Avisar de presencia para mantener el canal activo
        await channel.track({ online_at: new Date().toISOString() });
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Realtime KeepAlive] Error en el canal');
      } else if (status === 'CLOSED') {
        console.warn('[Realtime KeepAlive] Canal cerrado');
      }
    });

  // Retornar función de desuscripción
  return () => {
    console.log('[Realtime KeepAlive] Desuscribiendo del canal...');
    channel.unsubscribe();
  };
}
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
 * Utilidad para envolver promesas con timeout de 8 segundos.
 * Si la promesa tarda más, lanza un error y cancela con AbortController.
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 8000,
  abortController?: AbortController
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timeoutId = setTimeout(() => {
        if (abortController) {
          abortController.abort();
        }
        reject(
          new Error(
            `⏱️ Timeout: El servidor tardó más de ${timeoutMs}ms en responder. La conexión fue cancelada. Por favor, intenta de nuevo.`
          )
        );
      }, timeoutMs);
      
      // Limpiar timeout si la promesa se completa antes
      promise.finally(() => clearTimeout(timeoutId));
    }),
  ]);
}

/**
 * Crea un nuevo producto (solo admin).
 */
export async function createProduct(
  product: Omit<Product, 'id'>,
  accessToken: string,
): Promise<string> {
  const abortController = new AbortController();
  
  try {
    const response = await withTimeout(
      fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(product),
        signal: abortController.signal,
      }),
      8000,
      abortController
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Error creating product from API: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.id) {
      throw new Error('Product created but no ID returned from API');
    }
    
    return data.id;
  } catch (err) {
    // Cancelar la petición si aún está en progreso
    abortController.abort();
    
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('❌ [createProduct] Error:', errorMessage);
    
    // Re-lanzar con mensaje mejorado
    if (errorMessage.includes('Timeout')) {
      throw new Error(errorMessage); // Preservar mensaje de timeout
    } else if (errorMessage.includes('Failed to fetch')) {
      throw new Error('🌐 Error de conexión: Verifica tu conexión a internet y que el servidor esté disponible.');
    } else {
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
}

/**
 * Actualiza un producto existente (solo admin).
 */
export async function updateProduct(
  id: string,
  product: Partial<Omit<Product, 'id'>>,
  accessToken: string,
): Promise<void> {
  const abortController = new AbortController();
  
  try {
    const response = await withTimeout(
      fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(product),
        signal: abortController.signal,
      }),
      8000,
      abortController
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Error updating product from API: ${response.statusText}`);
    }
  } catch (err) {
    // Cancelar la petición si aún está en progreso
    abortController.abort();
    
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('❌ [updateProduct] Error:', errorMessage);
    
    // Re-lanzar con mensaje mejorado
    if (errorMessage.includes('Timeout')) {
      throw new Error(errorMessage); // Preservar mensaje de timeout
    } else if (errorMessage.includes('Failed to fetch')) {
      throw new Error('🌐 Error de conexión: Verifica tu conexión a internet y que el servidor esté disponible.');
    } else {
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
}

/**
 * Archiva un producto (soft delete) (solo admin).
 */
export async function archiveProduct(
  id: string,
  accessToken: string,
): Promise<void> {
  // Re-utiliza la función `updateProduct` que ya se comunica con el API seguro.
  // Archivar es simplemente una actualización que cambia el estado a inactivo.
  await updateProduct(id, { active: false }, accessToken);
}

// ─── Configuración del Sitio ─────────────────────────────────────────────────

/**
 * Obtiene la configuración del sitio.
 */
export async function getSiteConfig(): Promise<SiteConfig | null> {
  const response = await fetch('/api/config');
  if (!response.ok) {
    // No lanzar error si no se encuentra, simplemente devolver null
    return null;
  }
  const { config } = await response.json();
  return config ? mapSiteConfig(config) : null;
}

/**
 * Actualiza la configuración del sitio (solo admin).
 */
export async function updateSiteConfig(
  config: Partial<SiteConfig>,
  accessToken: string,
): Promise<void> {
  const response = await fetch('/api/config', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Error updating site config from API');
  }
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
  accessToken: string,
  statusFilter?: string,
): Promise<Order[]> {
  const url = new URL('/api/orders', window.location.origin);
  if (statusFilter) {
    url.searchParams.set('status', statusFilter);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Error fetching orders from API');
  }

  const { orders } = await response.json();
  return (orders ?? []).map(mapOrder);
}

/**
 * Actualiza el estado de una orden (solo admin).
 */
export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'paid' | 'failed' | 'delivered',
  accessToken: string,
): Promise<void> {
  const response = await fetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Error updating order status from API');
  }
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
  const response = await fetch('/api/gallery', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ url, label }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error adding photo from API');
  }

  return data.id;
}

/**
 * Obtiene todas las fotos de la galería.
 */
export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  const response = await fetch('/api/gallery');
  if (!response.ok) {
    return [];
  }
  const { photos } = await response.json();
  return (photos ?? []).map(mapGalleryPhoto);
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
