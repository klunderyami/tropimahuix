import { useState } from 'react';
import { Catalog } from '../components/Catalog';

export const LicoresPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'licor' | 'torito'>('licor');

  return (
    <div className="min-h-screen bg-paper">
      <div className="bg-brand-brown text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-display mb-4">Licores Artesanales</h1>
          <p className="text-xl text-stone-200 max-w-2xl mx-auto">
            Descubre nuestra colección de licores premium, elaborados con ingredientes selectos y la tradición de Mahuixtlán.
          </p>
        </div>
      </div>
      <Catalog selectedCategory={selectedCategory} onChangeCategory={setSelectedCategory} />
    </div>
  );
};