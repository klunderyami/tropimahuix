import { useState } from 'react';
import { Catalog } from '../components/Catalog';

export const ToritosPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'licor' | 'torito'>('torito');

  return (
    <div className="min-h-screen bg-paper">
      <div className="bg-brand-lime text-brand-brown py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-display mb-4">Toritos Cremosos</h1>
          <p className="text-xl max-w-2xl mx-auto">
            Nuestros toritos artesanales, cremosos y deliciosos, elaborados con la receta tradicional de Mahuixtlán.
          </p>
        </div>
      </div>
      <Catalog selectedCategory={selectedCategory} onChangeCategory={setSelectedCategory} />
    </div>
  );
};