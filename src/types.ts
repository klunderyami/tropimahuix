export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  volume: string;
  image: string;
  category: 'licor' | 'torito';
}

export interface HeroSlide {
  title: string;
  subtitle: string;
  image: string;
  cta: string;
}

export interface SiteConfig {
  heroSlides: HeroSlide[];
  introTitle: string;
  introText: string;
  videoTitle: string;
  videoSubtitle: string;
  videoImage: string;
  licoresHeaderImage: string;
  toritosHeaderImage: string;
  contactPhone: string;
  footerText: string;
}

export type Page = 'home' | 'licores' | 'toritos' | 'cart' | 'admin';
