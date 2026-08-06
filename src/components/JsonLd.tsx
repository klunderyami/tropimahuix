import { useEffect } from 'react';
import type { Product } from '../types';

interface JsonLdProps {
  data: Record<string, unknown>;
}

export const JsonLd = ({ data }: JsonLdProps) => {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    script.id = 'json-ld-schema';
    
    const existingScript = document.getElementById('json-ld-schema');
    if (existingScript) {
      existingScript.remove();
    }
    
    document.head.appendChild(script);
    
    return () => {
      const scriptToRemove = document.getElementById('json-ld-schema');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [data]);

  return null;
};

// ─── Organization Schema ──────────────────────────────────────────────────────

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  'name': 'Tropicaña',
  'description': 'Distribuidor de licores artesanales y toritos de Veracruz',
  'url': 'https://tropimahuix-web.onrender.com',
  'logo': 'https://tropimahuix-web.onrender.com/logo.png',
  'telephone': '+52-229-123-4567',
  'email': 'contacto@tropicana.com',
  'address': {
    '@type': 'PostalAddress',
    'addressLocality': 'Veracruz',
    'addressRegion': 'Veracruz',
    'addressCountry': 'MX',
    'postalCode': '91000'
  },
  'priceRange': '$$',
  'openingHours': 'Mo-Su 09:00-21:00',
  'image': 'https://tropimahuix-web.onrender.com/og-image.jpg',
  'sameAs': [
    'https://www.facebook.com/profile.php?id=100092299282591',
    'https://www.instagram.com/tropicanamahuix'
  ],
  'contactPoint': {
    '@type': 'ContactPoint',
    'telephone': '+52-229-123-4567',
    'contactType': 'sales',
    'availableLanguage': ['Spanish', 'English']
  }
};

// ─── Product Schema ───────────────────────────────────────────────────────────

export const productSchema = (product: Product, baseUrl: string): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  'name': product.name,
  'description': product.description,
  'image': product.image,
  'category': product.category === 'licor' ? 'Licor Artesanal' : 'Torito Cremoso',
  'brand': {
    '@type': 'Brand',
    'name': 'Tropicaña'
  },
  'offers': {
    '@type': 'Offer',
    'url': `${baseUrl}/producto/${product.id}`,
    'priceCurrency': 'MXN',
    'price': product.price,
    'availability': product.stock > 0 
      ? 'https://schema.org/InStock' 
      : 'https://schema.org/OutOfStock',
    'seller': {
      '@type': 'Organization',
      'name': 'Tropicaña'
    }
  },
  'additionalProperty': [
    {
      '@type': 'PropertyValue',
      'name': 'Volumen',
      'value': product.volume
    },
    {
      '@type': 'PropertyValue',
      'name': 'Categoría',
      'value': product.category === 'licor' ? 'Licor Artesanal' : 'Torito Cremoso'
    }
  ]
});

// ─── BreadcrumbList Schema ────────────────────────────────────────────────────

export const breadcrumbSchema = (items: Array<{ name: string; url: string }>): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  'itemListElement': items.map((item, index) => ({
    '@type': 'ListItem',
    'position': index + 1,
    'name': item.name,
    'item': item.url
  }))
});

// ─── WebSite Schema ───────────────────────────────────────────────────────────

export const websiteSchema = (baseUrl: string) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  'name': 'Tropicaña',
  'url': baseUrl,
  'description': 'Distribuidor de licores artesanales y toritos de Veracruz',
  'potentialAction': {
    '@type': 'SearchAction',
    'target': {
      '@type': 'EntryPoint',
      'urlTemplate': `${baseUrl}/buscar?q={search_term_string}`
    },
    'query-input': 'required name=search_term_string'
  }
});