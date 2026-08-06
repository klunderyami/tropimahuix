import { useEffect } from 'react';

interface SEOMetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
  productData?: {
    price?: number;
    availability?: string;
    brand?: string;
  };
}

export const SEOMetaTags = ({
  title = 'Tropicaña - Licores y Toritos Artesanales Veracruz',
  description = 'Descubre los mejores licores artesanales y toritos de Veracruz. Distribuidor oficial de bebidas artesanales. Ron artesanal, torito de chinchuya y más. Envíos a todo México.',
  image = 'https://tropimahuix-web.onrender.com/og-image.jpg',
  url = 'https://tropimahuix-web.onrender.com',
  type = 'website',
  productData
}: SEOMetaTagsProps) => {
  useEffect(() => {
    // Actualizar título de la página
    document.title = title;

    // Helper para actualizar o crear meta tags
    const updateMetaTag = (property: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${property}"]`) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, property);
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    };

    // Actualizar meta tags básicos
    updateMetaTag('title', title);
    updateMetaTag('description', description);
    updateMetaTag('author', 'Tropicaña');
    updateMetaTag('robots', 'index, follow');
    updateMetaTag('canonical', url);

    // Actualizar Open Graph tags
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:url', url, true);
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', image, true);
    updateMetaTag('og:image:width', '1200', true);
    updateMetaTag('og:image:height', '630', true);
    updateMetaTag('og:locale', 'es_MX', true);
    updateMetaTag('og:site_name', 'Tropicaña', true);

    // Actualizar Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:url', url);
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);

    // Si es un producto, agregar datos específicos de producto
    if (type === 'product' && productData) {
      updateMetaTag('product:price:amount', productData.price?.toString() || '', true);
      updateMetaTag('product:price:currency', 'MXN', true);
      if (productData.availability) {
        updateMetaTag('product:availability', productData.availability, true);
      }
      if (productData.brand) {
        updateMetaTag('product:brand', productData.brand, true);
      }
    }

    // Actualizar canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', url);

  }, [title, description, image, url, type, productData]);

  return null;
};