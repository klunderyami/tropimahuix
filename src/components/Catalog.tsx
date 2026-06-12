import React from 'react';
import { motion } from 'framer-motion';
import { Product } from '../types';

interface CatalogProps {
  products: Product[];
  selectedCategory: 'all' | 'licor' | 'torito';
  onChangeCategory: (category: 'all' | 'licor' | 'torito') => void;
  onAddToCart: (product: Product) => void;
}

const categoryTabs = [
  { label: 'Todas', value: 'all' as const },
  { label: 'Licores', value: 'licor' as const },
  { label: 'Toritos', value: 'torito' as const },
];

export const Catalog: React.FC<CatalogProps> = ({ products, selectedCategory, onChangeCategory, onAddToCart }) => {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 20,
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
        <div className="text-center mb-14">
          <h2 className="text-5xl md:text-6xl font-display text-brand-brown mb-4 tracking-wide">Nuestra Colección</h2>
          <p className="text-stone-600 font-medium max-w-xl mx-auto mb-4">
            Selecciona tu categoría artesanal y descubre botellas premium hechas a mano con sabor único.
          </p>
          <div className="h-1.5 w-28 bg-brand-orange mx-auto rounded-full shadow-sm"></div>
        </div>

        <div className="mb-10 flex flex-wrap justify-center gap-3">
          {categoryTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChangeCategory(tab.value)}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition-all ${
                selectedCategory === tab.value
                  ? 'bg-brand-orange text-white shadow-lg'
                  : 'bg-white/90 text-stone-600 border border-stone-200 hover:bg-brand-orange/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {products.length === 0 ? (
          <div className="rounded-4xl border border-stone-200 bg-white/80 p-16 text-center shadow-xl glass-card">
            <p className="text-xl font-semibold text-stone-700">No hay productos en esta categoría todavía.</p>
            <p className="mt-3 text-sm text-stone-500">Agrega nuevos artículos desde el panel de administración.</p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {products.map((product) => (
              <motion.article
                key={product.id}
                variants={cardVariants}
                className="glass-card bg-white rounded-3xl overflow-hidden border border-stone-200/60 shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col justify-between group"
              >
                <div className="h-80 overflow-hidden relative group-hover:cursor-pointer">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute top-4 right-4 bg-brand-brown/90 backdrop-blur-md text-brand-gold text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wider shadow-md">
                    {product.category}
                  </div>
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
                      <span className="text-2xl font-bold text-brand-orange">$</span>
                      {product.price}
                      <span className="text-sm text-stone-400 font-semibold ml-1">MXN</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => onAddToCart(product)}
                      className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-md hover:shadow-xl active:scale-[0.98] cursor-pointer tracking-wide"
                    >
                      Añadir al Carrito
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};
