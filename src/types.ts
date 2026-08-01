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

export interface Order {
  id: string;
  userId: string | 'guest';
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  paypalOrderId: string;
  createdAt: string;
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
}

export interface GalleryPhoto {
  id: string;
  url: string;
  label: string;
  createdAt: string;
  mediaType?: 'image' | 'video';
}

export type Page = 'home' | 'licores' | 'toritos' | 'cart' | 'admin';
