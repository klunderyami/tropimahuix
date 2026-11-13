import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { subscribeToProducts } from '../supabase.js';
import { useCart } from '../contexts/CartContext.js';

import type { Product } from '../types.js';

type CatalogCategory = 'all' | Product['category'];

interface CatalogProps {
  selectedCategory: CatalogCategory;
  onChangeCategory: (category: CatalogCategory) => void;
}

const categoryTabs: {
  label: string;
  value: CatalogCategory;
  accentClass: string;
  activeClass: string;
}[] = [
  {
    label: 'Todos',
    value: 'all',
    accentClass: 'bg-brand-gold',
    activeClass: 'bg-brand-brown text-white shadow-brand-brown/20',
  },
  {
    label: 'Licores Artesanales',
    value: 'licor',
    accentClass: 'bg-brand-orange',
    activeClass: 'bg-brand-orange text-white shadow-brand-orange/25',
  },
  {
    label: 'Toritos Cremosos',
    value: 'torito',
    accentClass: 'bg-brand-lime',
    activeClass: 'bg-brand-lime text-brand-brown shadow-brand-lime/25',
  },
];

const categoryLabels: Record<Product['category'], string> = {
  licor: 'Licor artesanal',
  torito: 'Torito cremoso',
};

const priceFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export const Catalog = ({ selectedCategory, onChangeCategory }: CatalogProps) => {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Reordenar productos: producto ancla primero, luego el resto
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      if (a.isAnchorProduct && !b.isAnchorProduct) return -1;
      if (!a.isAnchorProduct && b.isAnchorProduct) return 1;
      return 0;
    });
  }, [products]);

  useEffect(() => {
    const unsubscribe = subscribeToProducts(
      (fetchedProducts) => {
        setProducts(fetchedProducts);
        setLoadError(null);
        setIsLoading(false);
      },
      (error) => {
        setLoadError(error.message);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  const filteredProducts = useMemo(() => {
    const lowercasedQuery = searchQuery.trim().toLowerCase();

    const categoryFiltered =
      selectedCategory === 'all'
        ? sortedProducts
        : sortedProducts.filter((product) => product.category === selectedCategory);

    if (lowercasedQuery === '') {
      return categoryFiltered;
    }

    return categoryFiltered.filter(
      (product) =>
        product.name.toLowerCase().includes(lowercasedQuery) || product.description.toLowerCase().includes(lowercasedQuery),
    );
  }, [sortedProducts, selectedCategory, searchQuery]);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 20,
        staggerChildren: 0.06,
      },
    },
  } as const;

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 60, damping: 15 },
    },
  } as const;

  return (
    <section id="catalog" className="tropi-catalog-bg py-24 bg-paper relative overflow-hidden">
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(var(--color-brand-gold)_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-5xl md:text-6xl font-display text-brand-brown mb-4 tracking-wide">Nuestra Colección</h2>
          <p className="text-stone-600 font-medium max-w-xl mx-auto mb-4">
            Selecciona tu familia artesanal y descubre botellas premium hechas a mano con sabor único.
          </p>
          <div className="h-1.5 w-28 bg-brand-orange mx-auto rounded-full shadow-sm"></div>
        </div>

        <div className="mb-12 max-w-3xl mx-auto">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-stone-400">
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o descripción..."
              className="block w-full rounded-xl border-2 border-stone-200 bg-white py-4 pl-11 pr-4 text-stone-800 shadow-sm placeholder:text-stone-400 focus:border-brand-orange focus:ring-brand-orange sm:text-sm"
            />
          </div>
        </div>

        <div className="glass-card mx-auto mb-12 flex w-full max-w-3xl flex-col gap-2 rounded-2xl bg-white/75 p-2 shadow-xl sm:grid sm:grid-cols-3">
          {categoryTabs.map((tab) => {
            const isActive = selectedCategory === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onChangeCategory(tab.value)}
                className={`group relative min-h-12 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 ${
                  isActive
                    ? tab.activeClass
                    : 'text-stone-600 hover:bg-white/80 hover:text-brand-brown hover:shadow-md'
                }`}
                aria-pressed={isActive}
              >
                <span className="relative z-10">{tab.label}</span>
                <span
                  className={`absolute inset-x-5 bottom-2 h-0.5 rounded-full ${tab.accentClass} transition-opacity ${
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'
                  }`}
                  aria-hidden="true"
                ></span>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="glass-card rounded-2xl border border-stone-200 bg-white/80 p-12 text-center shadow-xl">
            <p className="text-xl font-semibold text-stone-700">Cargando catálogo artesanal...</p>
          </div>
        ) : loadError ? (
          <div className="glass-card rounded-2xl border border-rose-200 bg-white/80 p-12 text-center shadow-xl">
            <p className="text-xl font-semibold text-rose-700">No se pudo cargar el catálogo.</p>
            <p className="mt-3 text-sm text-stone-500">{loadError}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="glass-card rounded-2xl border border-stone-200 bg-white/80 p-12 text-center shadow-xl">
            <p className="text-xl font-semibold text-stone-700">No se encontraron productos.</p>
            {searchQuery ? (
              <p className="mt-3 text-sm text-stone-500">Intenta con otra búsqueda o ajusta los filtros.</p>
            ) : (
              <p className="mt-3 text-sm text-stone-500">Pronto agregaremos nuevos artículos a esta categoría.</p>
            )}
          </div>
        ) : (
          <>
            {/* Banner de Producto Ancla (Value Anchoring) */}
            {(() => {
              if (selectedCategory !== 'all') return null;
              const anchorProduct = filteredProducts.find(p => p.isAnchorProduct);
              if (!anchorProduct) return null;
              
              return (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="mb-12"
                >
                  <div className="glass-card relative overflow-hidden rounded-[2rem] border-2 border-brand-gold/40 bg-gradient-to-br from-amber-50/95 via-white/90 to-orange-50/95 p-8 shadow-2xl backdrop-blur-xl md:p-12">
                    {/* Insignia de edición limitada */}
                    <div className="absolute top-6 right-6 z-10">
                      <div className="glass-card rounded-full bg-gradient-to-r from-brand-orange to-amber-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
                        {anchorProduct.badgeText || '⭐ Producto Premium'}
                      </div>
                    </div>

                    <div className="grid gap-8 md:grid-cols-2 md:gap-12">
                      {/* Imagen del producto ancla */}
                      <div className="relative">
                        <div className="aspect-square overflow-hidden rounded-3xl bg-white shadow-xl">
                          <img
                            src={anchorProduct.image}
                            alt={anchorProduct.name}
                            className="h-full w-full object-contain transition-transform duration-700 hover:scale-105"
                          />
                        </div>
                        {anchorProduct.limitedStockCount && anchorProduct.limitedStockCount <= 5 && (
                          <div className="absolute -top-2 -right-2 animate-pulse">
                            <div className="rounded-full bg-rose-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
                              🔥 Solo {anchorProduct.limitedStockCount} unidades
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Información del producto ancla */}
                      <div className="flex flex-col justify-center">
                        <div className="mb-4">
                          <span className="inline-block rounded-full bg-brand-orange/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-brand-orange">
                            {anchorProduct.category === 'licor' ? 'Licor Artesanal Premium' : 'Torito Cremoso Premium'}
                          </span>
                        </div>
                        
                        <h3 className="text-4xl md:text-5xl font-display font-black text-brand-brown mb-4">
                          {anchorProduct.name}
                        </h3>
                        
                        <p className="text-lg text-stone-600 leading-relaxed mb-6">
                          {anchorProduct.description}
                        </p>

                        <div className="mb-6 flex items-baseline gap-3">
                          <span className="text-5xl font-black text-brand-orange">
                            ${anchorProduct.price.toFixed(2)}
                          </span>
                          <span className="text-lg text-stone-400 font-semibold">MXN</span>
                        </div>

                        {anchorProduct.limitedStockCount && (
                          <div className="mb-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
                            <p className="text-sm font-bold text-brand-brown">
                              ⚠️ Edición Limitada: Solo {anchorProduct.limitedStockCount} botellas disponibles
                            </p>
                            <p className="mt-1 text-xs text-stone-600">
                              Lote artesanal numerado - Agotamiento permanente
                            </p>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => addToCart(anchorProduct, 1)}
                          disabled={anchorProduct.stock === 0}
                          className="w-full rounded-full bg-gradient-to-r from-brand-orange to-amber-500 px-8 py-4 text-base font-bold text-white shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50 md:text-lg"
                        >
                          {anchorProduct.stock === 0 ? 'Agotado' : '🛒 Agregar al Carrito - Edición Limitada'}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            <motion.div
              key={selectedCategory}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-7"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock === 0;
                const categoryLabel = categoryLabels[product.category];

                // Filtrar el producto ancla del grid normal (ya se muestra en el banner)
                if (product.isAnchorProduct && selectedCategory === 'all') {
                  return null;
                }

                return (
                  <motion.article
                    key={product.id}
                    variants={cardVariants}
                    className="tropi-product-card group"
                  >
                    <Link to={`/producto/${product.id}`} className="tropi-product-card__visual" aria-label={`Ver detalles de ${product.name}`}>
                      <span className="tropi-product-card__tag">{categoryLabel}</span>
                      {isOutOfStock && <span className="tropi-product-card__soldout">Agotado</span>}
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        sizes="(max-width: 640px) 90vw, (max-width: 1024px) 46vw, (max-width: 1280px) 30vw, 23vw"
                        className={`tropi-product-card__image ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
                      />
                    </Link>
                    <div className="tropi-product-card__body">
                      <p className="tropi-product-card__meta">TROPICAÑA · {product.volume}</p>
                      <Link to={`/producto/${product.id}`} className="tropi-product-card__name-link">
                        <h3 className="tropi-product-card__name">{product.name}</h3>
                      </Link>
                      <p className="tropi-product-card__description">{product.description}</p>
                      <div className="tropi-product-card__footer">
                        <div className="tropi-product-card__price">{priceFormatter.format(product.price)} <span>MXN</span></div>
                        <button
                          type="button"
                          onClick={() => addToCart(product, 1)}
                          disabled={isOutOfStock}
                          className="tropi-product-card__button"
                          aria-label={isOutOfStock ? `${product.name} agotado` : `Agregar ${product.name} al carrito`}
                        >
                          {isOutOfStock ? 'Agotado' : 'Agregar al carrito'}
                        </button>
                        <Link to={`/producto/${product.id}`} className="tropi-product-card__details">Ver detalles del producto</Link>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
};
