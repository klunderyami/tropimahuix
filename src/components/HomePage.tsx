import { useMemo, useState } from 'react';
import { useCart } from '../contexts/CartContext.js';
import { useSiteConfig } from '../contexts/SiteConfigContext.js';
import { Catalog } from './Catalog.js';
import { Hero } from './Hero.js';
import HomeCarousel from './HomeCarousel.js';
import type { Product } from '../types.js';

const HomePage = () => {
  const { addToCart } = useCart();
  const { config } = useSiteConfig();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'licor' | 'torito'>('all');

  return (
    <div>
      <Hero welcomeMessage={config?.welcomeMessage} />
      <HomeCarousel />
      <Catalog
        selectedCategory={selectedCategory}
        onChangeCategory={setSelectedCategory}
        onAddToCart={addToCart}
      />
    </div>
  );
};

export default HomePage;