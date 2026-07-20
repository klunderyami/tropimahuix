import { useMemo, useState } from 'react';
import { useCart } from '../contexts/CartContext.js';
import { useSiteConfig } from '../contexts/SiteConfigContext.js';
import { Catalog } from './Catalog.js';
import { Hero } from './Hero.js';
import HomeCarousel from './HomeCarousel.js';
import type { Product } from '../types.js';

const HomePage = () => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'licor' | 'torito'>('all');

  return (
    <div>
      <Hero />
      <HomeCarousel />
      <Catalog
        selectedCategory={selectedCategory}
        onChangeCategory={setSelectedCategory}
      />
    </div>
  );
};

export default HomePage;