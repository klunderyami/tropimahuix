import { createClient } from '@supabase/supabase-js';
import type { Product, Order, SiteConfig, GalleryPhoto, DistributorLead, NewDistributorLead, DistributorLeadStatus, ChatMessage, NewChatMessage, ChatMessageStatus } from './types.js';

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
// Singleton pattern for Supabase client to prevent HMR issues in development
const createSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
};

// Usamos una variable global para que el cliente persista entre recargas de HMR en desarrollo.
const globalForSupabase = globalThis as unknown as { supabase: ReturnType<typeof createSupabaseClient> };

export const supabase = globalForSupabase.supabase ?? createSupabaseClient();

if (import.meta.env.DEV) globalForSupabase.supabase = supabase;

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
    .on('presence', { event: 'join' }, ({ key }) => {
      console.log(`[Realtime KeepAlive] Usuario unido al canal: ${key}`);
    })
    .on('presence', { event: 'leave' }, ({ key }) => {
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
        try {
          await channel.track({ online_at: new Date().toISOString() });
        } catch (trackError) {
          console.error('[Realtime KeepAlive] Error al hacer track:', trackError);
        }
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
 * Helper para realizar peticiones fetch autenticadas a la API del backend,
 * con timeout, cancelación y manejo de errores unificado.
 */
async function authedFetch<T>(
  url: string,
  options: RequestInit,
  accessToken: string,
): Promise<T> {
  const abortController = new AbortController();

  try {
    const response = await withTimeout(
      fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...options.headers,
        },
        signal: abortController.signal,
      }),
      8000, // Timeout de 8 segundos
      abortController,
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Error desde la API: ${response.statusText}`);
    }

    return data as T;
  } catch (err) {
    abortController.abort();
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`❌ [authedFetch] Error en ${options.method} ${url}:`, errorMessage);

    if (errorMessage.includes('Timeout')) {
      throw new Error(errorMessage);
    } else if (errorMessage.includes('Failed to fetch')) {
      throw new Error('🌐 Error de conexión: Verifica tu conexión a internet y que el servidor esté disponible.');
    }
    throw err instanceof Error ? err : new Error(errorMessage);
  }
}

/**
 * Crea un nuevo producto (solo admin).
 */
export async function createProduct(
  product: Omit<Product, 'id'>,
  accessToken: string,
): Promise<string> {
  const data = await authedFetch<{ id: string }>('/api/products', {
    method: 'POST',
    body: JSON.stringify(product),
  }, accessToken);

  if (!data.id) {
    throw new Error('El producto fue creado pero la API no retornó un ID.');
  }
  return data.id;
}

/**
 * Actualiza un producto existente (solo admin).
 */
export async function updateProduct(
  id: string,
  product: Partial<Omit<Product, 'id'>>,
  accessToken: string,
): Promise<void> {
  await authedFetch(`/api/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(product),
  }, accessToken);
}

/**
 * Elimina un producto permanentemente (solo admin).
 */
export async function deleteProduct(
  id: string,
  accessToken: string,
): Promise<void> {
  await authedFetch(`/api/products/${id}`, {
    method: 'DELETE',
  }, accessToken);
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
  await authedFetch('/api/config', {
    method: 'PATCH',
    body: JSON.stringify(config),
  }, accessToken);
}

// ─── Órdenes ─────────────────────────────────────────────────────────────────

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

  const { orders } = await authedFetch<{ orders: Record<string, unknown>[] }>(url.toString(), {
    method: 'GET',
  }, accessToken);

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
  await authedFetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }, accessToken);
}

// ─── Galería de Fotos ────────────────────────────────────────────────────────

/**
 * Sube una imagen a Supabase Storage y retorna la URL pública.
 * @param imageBase64 - Imagen en formato base64 (data:image/jpeg;base64,...)
 * @param fileName - Nombre del archivo (sin ruta)
 * @param accessToken - Token de acceso del admin
 * @returns URL pública de la imagen subida
 */
export async function uploadMedia(
  mediaBase64: string,
  fileName: string,
  accessToken: string,
  contentType: string,
): Promise<string> {
  const response = await fetch('/api/upload/media', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ imageBase64: mediaBase64, fileName, contentType }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data.error || `Error al subir archivo: ${response.statusText}`,
    );
  }

  const data = await response.json();
  if (!data.url) {
    throw new Error('No URL returned from upload endpoint');
  }

  return data.url;
}

/**
 * Agrega una foto a la galería (solo admin).
 */
export async function addGalleryPhoto(
  url: string,
  label: string,
  accessToken: string,
): Promise<string> {
  const data = await authedFetch<{ id: string }>('/api/gallery', {
    method: 'POST',
    body: JSON.stringify({ url, label }),
  }, accessToken);

  return data.id;
}

/**
 * Elimina una foto de la galería (solo admin).
 */
export async function deleteGalleryPhoto(
  photoId: string,
  accessToken: string,
): Promise<void> {
  await authedFetch(`/api/gallery/${photoId}`, {
    method: 'DELETE',
  }, accessToken);
}

/**
 * Obtiene todas las fotos de la galería.
 */
export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  const response = await fetch('/api/gallery');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Error al obtener la galería: ${response.statusText}` }));
    throw new Error(errorData.error || `Error ${response.status}: No se pudo conectar con la galería.`);
  }
  const { photos } = await response.json();
  return (photos ?? []).map(mapGalleryPhoto);
}

/**
 * Registra una visita al sitio (público - no requiere autenticación).
 */
export async function trackVisit(): Promise<number> {
  try {
    const response = await fetch('/api/stats/visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Error tracking visit:', response.status);
      return 0;
    }

    const data = await response.json();
    return data.visitCount || 0;
  } catch (error) {
    console.error('Error tracking visit:', error);
    return 0;
  }
}

/**
 * Obtiene el contador de visitas actual (público).
 */
export async function getVisitCount(): Promise<number> {
  try {
    const response = await fetch('/api/stats/visit', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Error fetching visit count:', response.status);
      return 0;
    }

    const data = await response.json();
    return data.visitCount || 0;
  } catch (error) {
    console.error('Error fetching visit count:', error);
    return 0;
  }
}

/**
 * Obtiene estadísticas del sitio (solo admin).
 */
export async function getStats(accessToken: string): Promise<{
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  visitCount: number;
  topProduct: { name: string; quantity: number };
  activeProducts: number;
  lowStockProducts: number;
}> {
  const response = await fetch('/api/stats', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Error al obtener estadísticas: ${response.statusText}` }));
    throw new Error(errorData.error || `Error ${response.status}: No se pudieron cargar las estadísticas.`);
  }

  return response.json();
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
    stock: Number(data.stock) || 0,
    active: data.active !== false,
    gallery: Array.isArray(data.gallery) ? data.gallery : [],
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
    heroTitle: (data.hero_title as string) ?? '',
    logoUrl: (data.logo_url as string) ?? '',
    welcomeMessage: (data.welcome_message as string) ?? '',
    heroSubtitle: (data.hero_subtitle as string) ?? '',
    introTitle: (data.intro_title as string) ?? '',
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
  // Soportar múltiples nombres de columna para la URL
  const url = (data.url as string) || (data.image_url as string) || (data.imageUrl as string) || (data.src as string) || '';
  const isVideo = /\.(mp4|webm|mov|ogg)$/i.test(url);
  
  // Log para debugging
  if (!url) {
    console.warn('[Gallery Mapping] Foto sin URL:', data);
  }
  
  return {
    id: data.id as string,
    url: url,
    label: (data.label as string) ?? '',
    createdAt: (data.created_at as string) ?? new Date().toISOString(),
    mediaType: isVideo ? 'video' : 'image',
  };
}

// ─── Distribuidores (B2B Leads) ──────────────────────────────────────────────

/**
 * Crea un nuevo lead de distribuidor (público - no requiere autenticación).
 */
export async function createDistributorLead(lead: NewDistributorLead): Promise<string> {
  const response = await fetch('/api/distributors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(lead),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Error al crear lead' }));
    throw new Error(data.error || `Error ${response.status}: No se pudo registrar el lead.`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Obtiene todos los leads de distribuidores (solo admin).
 */
export async function getDistributorLeads(accessToken: string, statusFilter?: string): Promise<DistributorLead[]> {
  const url = new URL('/api/distributors', window.location.origin);
  if (statusFilter) {
    url.searchParams.set('status', statusFilter);
  }

  const { leads } = await authedFetch<{ leads: Record<string, unknown>[] }>(url.toString(), {
    method: 'GET',
  }, accessToken);

  return (leads ?? []).map(mapDistributorLead);
}

/**
 * Actualiza el estado de un lead de distribuidor (solo admin).
 */
export async function updateDistributorLeadStatus(
  leadId: string,
  status: DistributorLeadStatus,
  accessToken: string,
): Promise<void> {
  await authedFetch(`/api/distributors/${leadId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }, accessToken);
}

/**
 * Elimina un lead de distribuidor (solo admin).
 */
export async function deleteDistributorLead(leadId: string, accessToken: string): Promise<void> {
  await authedFetch(`/api/distributors/${leadId}`, {
    method: 'DELETE',
  }, accessToken);
}

// ─── Chat de Atención a Clientes ─────────────────────────────────────────────

/**
 * Crea un nuevo mensaje de chat (público - no requiere autenticación).
 */
export async function createChatMessage(message: NewChatMessage): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Error al enviar mensaje' }));
    throw new Error(data.error || `Error ${response.status}: No se pudo enviar el mensaje.`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Obtiene todos los mensajes de chat (solo admin).
 */
export async function getChatMessages(accessToken: string, statusFilter?: string): Promise<ChatMessage[]> {
  const url = new URL('/api/chat', window.location.origin);
  if (statusFilter) {
    url.searchParams.set('status', statusFilter);
  }

  const { messages } = await authedFetch<{ messages: Record<string, unknown>[] }>(url.toString(), {
    method: 'GET',
  }, accessToken);

  return (messages ?? []).map(mapChatMessage);
}

/**
 * Responde a un mensaje de chat (solo admin).
 */
export async function answerChatMessage(
  messageId: string,
  answer: string,
  accessToken: string,
): Promise<void> {
  await authedFetch(`/api/chat/${messageId}/answer`, {
    method: 'PATCH',
    body: JSON.stringify({ answer }),
  }, accessToken);
}

/**
 * Actualiza el estado de un mensaje de chat (solo admin).
 */
export async function updateChatMessageStatus(
  messageId: string,
  status: ChatMessageStatus,
  accessToken: string,
): Promise<void> {
  await authedFetch(`/api/chat/${messageId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }, accessToken);
}

// ─── Funciones de mapeo adicionales ──────────────────────────────────────────

function mapDistributorLead(data: Record<string, unknown>): DistributorLead {
  return {
    id: data.id as string,
    full_name: (data.full_name as string) ?? '',
    phone: (data.phone as string) ?? '',
    email: (data.email as string) ?? '',
    city_state: (data.city_state as string) ?? '',
    business_name: (data.business_name as string) || undefined,
    message: (data.message as string) || undefined,
    status: (data.status as DistributorLeadStatus) ?? 'pending',
    created_at: (data.created_at as string) ?? new Date().toISOString(),
    updated_at: (data.updated_at as string) || undefined,
  };
}

function mapChatMessage(data: Record<string, unknown>): ChatMessage {
  return {
    id: data.id as string,
    name: (data.name as string) ?? '',
    email: (data.email as string) || undefined,
    phone: (data.phone as string) || undefined,
    message: (data.message as string) ?? '',
    status: (data.status as ChatMessageStatus) ?? 'pending',
    created_at: (data.created_at as string) ?? new Date().toISOString(),
    answered_at: (data.answered_at as string) || undefined,
    answer: (data.answer as string) || undefined,
  };
}
