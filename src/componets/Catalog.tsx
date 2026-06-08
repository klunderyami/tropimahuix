import React from 'react';

// 1. Definimos la interfaz para que TypeScript nos ayude
export interface Product {
  id: string | number;
  name: string;
  category: string;
  price: number;
  volume: string;
  image: string;
}

// 2. Props para recibir el manejador de carrito
interface CatalogProps {
  onAddToCart?: (product: Product) => void;
}

export const Catalog: React.FC<CatalogProps> = ({ onAddToCart }) => {
  const testProducts: Product[] = [
    { id: 1, name: 'Vainilla Suprema', category: 'Licor', price: 250, volume: '1L', image: 'https://picsum.photos/seed/vainilla/400/600' },
    { id: 2, name: 'Coco Tradicional', category: 'Torito', price: 280, volume: '1L', image: 'https://picsum.photos/seed/coco/400/600' },
    { id: 3, name: 'Café de Altura', category: 'Licor', price: 260, volume: '1L', image: 'https://picsum.photos/seed/cafe/400/600' },
  ];

  return (
    <section id="licores" className="py-24 bg-stone-50 relative">
      <div className="absolute inset-0 opacity-50 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-extrabold text-amber-950 mb-4 font-serif italic tracking-wide">
            Nuestra Colección
          </h2>
          <div className="h-1 w-24 bg-amber-500 mx-auto rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {testProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-3xl shadow-xl overflow-hidden border border-amber-100 transition-transform duration-300 hover:-translate-y-2">
              <div className="h-72 overflow-hidden relative group">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute top-4 right-4 bg-stone-900/80 backdrop-blur-sm text-amber-300 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide">
                  {product.category}
                </div>
              </div>
              <div className="p-8 text-center">
                <h3 className="text-2xl font-bold text-stone-800 mb-2">{product.name}</h3>
                <p className="text-stone-500 font-medium mb-4">{product.volume}</p>
                <p className="text-4xl font-extrabold text-amber-600 mb-6">
                  ${product.price} <span className="text-base text-stone-400 font-medium">MXN</span>
                </p>
                <button 
                  onClick={() => onAddToCart?.(product)}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold py-4 rounded-xl transition-all duration-300 shadow-md hover:shadow-xl active:scale-95"
                >
                  Añadir al Carrito
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};