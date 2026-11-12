import { useState } from 'react';
import { Catalog } from '../components/Catalog';

export const LicoresPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'licor' | 'torito'>('licor');
  const [showReferenceBottles, setShowReferenceBottles] = useState(true);

  return (
    <div className="min-h-screen bg-paper">
      <header className="tropi-licores-showcase" aria-labelledby="licores-heading">
        <div className="tropi-licores-showcase__content">
          <div className="tropi-licores-showcase__copy">
            <span className="tropi-licores-showcase__eyebrow">Tradición veracruzana en cada botella</span>
            <h1 id="licores-heading">Licores Artesanales</h1>
            <p>
              Descubre nuestra colección de licores premium, elaborados con ingredientes
              selectos y la tradición de Mahuixtlán.
            </p>
            <a className="tropi-licores-showcase__action" href="#catalog">Descubrir la colección</a>
          </div>
          {showReferenceBottles && (
            <div className="tropi-licores-showcase__products">
              <img
                src="/feature/licores-jamaica-arandano-mora.png"
                alt="Botellas originales Tropicaña: licor de Jamaica, Arándano y Mora Azul"
                loading="eager"
                decoding="async"
                onError={() => setShowReferenceBottles(false)}
              />
            </div>
          )}
        </div>
      </header>
      <Catalog selectedCategory={selectedCategory} onChangeCategory={setSelectedCategory} />
    </div>
  );
};
