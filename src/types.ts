export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  volume: string;
  image: string;
  gallery?: string[];
  category: 'licor' | 'torito';
  stock: number;
  active?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type NewProduct = Omit<Product, 'id'>;

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'delivered';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ShippingAddress {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
}

export type DiscoverySource = 'social_media' | 'friend_recommendation' | 'google_search' | 'physical_location' | 'other';

export interface Order {
  id: string;
  userId: string | 'guest';
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  paypalOrderId: string;
  createdAt: string;
  discoverySource?: DiscoverySource;
}

export interface HeroSlide {
  title: string;
  subtitle: string;
  image: string;
  cta: string;
}

export interface SiteConfig {
  heroTitle?: string;
  heroSubtitle?: string;
  logoUrl?: string;
  welcomeMessage?: string;
  introTitle?: string;
  introText?: string;
  videoTitle?: string;
  videoSubtitle?: string;
  videoImage?: string;
  licoresHeaderImage?: string;
  toritosHeaderImage?: string;
  contactPhone?: string;
  footerText?: string;
  totalVisits?: number;
}

export interface GalleryPhoto {
  id: string;
  url: string;
  label: string;
  createdAt: string;
  mediaType?: 'image' | 'video';
}

export type Page = 'home' | 'licores' | 'toritos' | 'cart' | 'admin';

// ─── Distribuidores (B2B Leads) ──────────────────────────────────────────────

export type DistributorLeadStatus = 'pending' | 'contacted' | 'qualified' | 'converted' | 'rejected';

export interface DistributorLead {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  city_state: string;
  business_name?: string;
  message?: string;
  status: DistributorLeadStatus;
  created_at: string;
  updated_at?: string;
}

export type NewDistributorLead = Omit<DistributorLead, 'id' | 'created_at' | 'updated_at' | 'status'>;

// ─── Chat de Atención a Clientes ─────────────────────────────────────────────

export type ChatMessageStatus = 'pending' | 'answered' | 'closed';

export interface ChatMessage {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  message: string;
  status: ChatMessageStatus;
  created_at: string;
  answered_at?: string;
  answer?: string;
}

export type NewChatMessage = Omit<ChatMessage, 'id' | 'created_at' | 'answered_at' | 'status' | 'answer'>;
