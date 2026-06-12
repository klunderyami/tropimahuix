import { useEffect, useMemo, useState, Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminRoute from './components/AdminRoute';
import { useCart } from './contexts/CartContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Catalog } from './components/Catalog';
import { CartSidebar } from './components/CartSidebar';
import { AdminPanel } from './components/AdminPanel';
import { CartItem, NewProduct, Product } from './types';

// Lazy load AdminDashboard to reduce main bundle size
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-paper">
    <div className="text-center">
      <div className="mb-4 text-4xl">🌴</div>
      <p className="text-stone-600 font-medium">Cargando panel de administración...</p>
    </div>
  </div>
);

const initialProducts: Product[] = [
  {
    id: '1',
    name: 'Vainilla Suprema',
    description: 'Licor artesanal de vainilla con notas dulces y aromáticas.',
    category: 'licor',
    price: 250,
    volume: '1L',
    image: 'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: '2',
    name: 'Coco Tradicional',
    description: 'Torito Veracruzano con esencia de coco puro y tradición familiar.',
    category: 'torito',
    price: 280,
    volume: '1L',
    image: 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: '3',
    name: 'Café de Altura',
    description: 'Licor destilado con granos de café de altura premium y cuerpo intenso.',
    category: 'licor',
    price: 260,
    volume: '1L',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600',
  },
];

function App() {
  const [serverStatus, setServerStatus] = useState<string>('Verificando conexión...');
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, cartItemCount, isCartOpen, setIsCartOpen } = useCart();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'licor' | 'torito'>('all');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error('Servidor no responde');
        return res.json();
      })
      .then((data) => setServerStatus(data.message))
      .catch(() => setServerStatus('⚠️ Backend no disponible'));
  }, []);

  const filteredProducts = useMemo(
    () =>
      selectedCategory === 'all'
        ? products
        : products.filter((product) => product.category === selectedCategory),
    [products, selectedCategory]
  );


  const addProduct = (product: NewProduct) => {
    const newId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Date.now().toString();

    setProducts((prevProducts) => [...prevProducts, { ...product, id: newId }]);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div id="home" className="min-h-screen bg-paper font-sans text-stone-900 scroll-smooth selection:bg-brand-orange/20 selection:text-brand-brown">
            <Navbar
              cartItemCount={cartItemCount}
              isCartOpen={isCartOpen}
              setIsCartOpen={setIsCartOpen}
            />

            <main>
              <Hero />

              <Catalog
                products={filteredProducts}
                selectedCategory={selectedCategory}
                onChangeCategory={setSelectedCategory}
                onAddToCart={addToCart}
              />

              {/* AdminPanel moved to protected /admin route */}

              <CartSidebar
                cart={cart}
                isOpen={isCartOpen}
                setIsOpen={setIsCartOpen}
                updateQuantity={updateQuantity}
                removeFromCart={removeFromCart}
                clearCart={clearCart}
              />
            </main>

            <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-16 border-t border-stone-200 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="inline-flex items-center gap-3 bg-white px-5 py-2.5 rounded-full shadow-sm border border-stone-200">
                  <span className="flex h-3 w-3 relative">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        serverStatus.includes('⚠️') ? 'bg-rose-400' : 'bg-emerald-400'
                      }`}
                    ></span>
                    <span
                      className={`relative inline-flex rounded-full h-3 w-3 ${
                        serverStatus.includes('⚠️') ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    ></span>
                  </span>
                  <p className="text-sm font-medium text-stone-600">
                    <span className="font-bold text-stone-400 uppercase tracking-wider text-xs mr-2">Core API:</span>
                    {serverStatus}
                  </p>
                </div>
                <p className="text-xs text-stone-400 font-light">
                  &copy; {new Date().getFullYear()} Tropicaña — Licores y Toritos 100% Artesanales. Todos los derechos reservados.
                </p>
              </div>
            </footer>
          </div>
        }
      />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Suspense fallback={<LoadingFallback />}>
              <AdminDashboard onAddProduct={addProduct} />
            </Suspense>
          </AdminRoute>
        }
      />
    </Routes>
  );
}

export default App;
