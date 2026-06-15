import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, onSnapshot } from '../firebase.js';
import { db } from '../firebase.js';
import type { Product } from '../types.js';

type CatalogCategory = 'all' | Product['category'];

interface CatalogProps {
  selectedCategory: CatalogCategory;
  onChangeCategory: (category: CatalogCategory) => void;
  onAddToCart: (product: Product) => void;
}

type FirestoreProduct = Omit<Product, 'id'> & {
  active?: boolean;
};

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

const categoryBadgeClasses: Record<Product['category'], string> = {
  licor: 'bg-brand-orange/95 text-white',
  torito: 'bg-brand-lime/95 text-brand-brown',
};

const categoryPriceClasses: Record<Product['category'], string> = {
  licor: 'text-brand-orange',
  torito: 'text-brand-lime',
};

function isValidCategory(category: unknown): category is Product['category'] {
  return category === 'licor' || category === 'torito';
}

function toProduct(id: string, data: Partial<FirestoreProduct>): Product | null {
  if (
    typeof data.name !== 'string' ||
    typeof data.description !== 'string' ||
    typeof data.price !== 'number' ||
    typeof data.volume !== 'string' ||
    typeof data.image !== 'string' ||
    !isValidCategory(data.category)
  ) {
    return null;
  }

  return {
    id,
    name: data.name,
    description: data.description,
    price: data.price,
    volume: data.volume,
    image: data.image,
    category: data.category,
    stock: typeof data.stock === 'number' ? data.stock : 0,
  };
}

export const Catalog = ({ selectedCategory, onChangeCategory, onAddToCart }: CatalogProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const firestoreProducts = snapshot.docs
          .map((documentSnapshot) => {
            const data = documentSnapshot.data() as Partial<FirestoreProduct>;

            if (data.active === false) {
              return null;
            }

            return toProduct(documentSnapshot.id, data);
          })
          .filter((product): product is Product => product !== null);

        setProducts(firestoreProducts);
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

  const filteredProducts = useMemo(
    () =>
      selectedCategory === 'all'
        ? products
        : products.filter((product) => product.category === selectedCategory),
    [products, selectedCategory],
  );

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
    <section id="catalog" className="py-24 bg-paper relative overflow-hidden">
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(var(--color-brand-gold)_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-5xl md:text-6xl font-display text-brand-brown mb-4 tracking-wide">Nuestra Colección</h2>
          <p className="text-stone-600 font-medium max-w-xl mx-auto mb-4">
            Selecciona tu familia artesanal y descubre botellas premium hechas a mano con sabor único.
          </p>
          <div className="h-1.5 w-28 bg-brand-orange mx-auto rounded-full shadow-sm"></div>
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
            <p className="text-xl font-semibold text-stone-700">No hay productos en esta categoría todavía.</p>
            <p className="mt-3 text-sm text-stone-500">Agrega nuevos artículos desde el panel de administración.</p>
          </div>
        ) : (
          <motion.div
            key={selectedCategory}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredProducts.map((product) => {
              const isOutOfStock = product.stock === 0;
              const categoryLabel = categoryLabels[product.category];
              const categoryBadgeClass = categoryBadgeClasses[product.category];
              const categoryPriceClass = categoryPriceClasses[product.category];

              return (
                <motion.article
                  key={product.id}
                  variants={cardVariants}
                  className={`glass-card overflow-hidden border border-stone-200/60 bg-white/85 shadow-lg transition-all duration-300 flex flex-col justify-between group ${
                    isOutOfStock ? 'opacity-75' : 'hover:shadow-2xl hover:-translate-y-1'
                  }`}
                >
                  <div className="h-80 overflow-hidden relative group-hover:cursor-pointer">
                    <img
                      src={product.image}
                      alt={product.name}
                      className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
                        isOutOfStock ? 'grayscale' : 'group-hover:scale-105'
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/45 via-transparent to-transparent opacity-80 transition-opacity duration-300" />
                    <div
                      className={`absolute top-4 right-4 backdrop-blur-md text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wider shadow-md ${categoryBadgeClass}`}
                    >
                      {categoryLabel}
                    </div>
                    {isOutOfStock && (
                      <div className="absolute inset-x-6 bottom-6 rounded-xl bg-stone-950/80 px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md">
                        Agotado
                      </div>
                    )}
                  </div>

                  <div className="p-8 text-center flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-brand-brown mb-3 group-hover:text-brand-orange transition-colors duration-300">
                        {product.name}
                      </h3>
                      <p className="text-stone-500 text-sm leading-relaxed mb-6">{product.description}</p>
                      <p className="text-sm text-stone-400 font-medium uppercase tracking-[0.2em] mb-4">
                        Cont. Neto {product.volume}
                      </p>
                    </div>

                    <div>
                      <p className="text-4xl font-extrabold text-brand-brown mb-6 flex items-center justify-center gap-1">
                        <span className={`text-2xl font-bold ${categoryPriceClass}`}>$</span>
                        {product.price}
                        <span className="text-sm text-stone-400 font-semibold ml-1">MXN</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => onAddToCart(product)}
                        disabled={isOutOfStock}
                        className={`w-full rounded-xl py-4 font-bold tracking-wide shadow-md transition-all duration-300 ${
                          isOutOfStock
                            ? 'cursor-not-allowed bg-stone-200 text-stone-500 shadow-none'
                            : product.category === 'torito'
                              ? 'cursor-pointer bg-brand-lime text-brand-brown hover:bg-brand-lime/85 hover:shadow-xl active:scale-[0.98]'
                              : 'cursor-pointer bg-brand-orange text-white hover:bg-brand-orange/90 hover:shadow-xl active:scale-[0.98]'
                        }`}
                      >
                        {isOutOfStock ? 'Agotado' : 'Agregar al carrito'}
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
};
