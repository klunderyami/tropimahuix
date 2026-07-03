import { useEffect, useState, Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminRoute from './components/AdminRoute.js';
import { useCart } from './contexts/CartContext.js';
import { Navbar } from './components/Navbar.js';
import { Hero } from './components/Hero.js';
import { Catalog } from './components/Catalog.js';
import { CartSidebar } from './components/CartSidebar.js';
import { CheckoutForm } from './components/CheckoutForm.js';
import { OrderConfirmation } from './components/OrderConfirmation.js';

// Lazy load AdminDashboard to reduce main bundle size
const AdminDashboard = lazy(() => import('./components/AdminDashboard.js'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-paper">
    <div className="text-center">
      <div className="mb-4 text-4xl">🌴</div>
      <p className="text-stone-600 font-medium">Cargando panel de administración...</p>
    </div>
  </div>
);

const SOCIAL_LINKS = {
  facebook: 'https://www.facebook.com/profile.php?id=100092299282591&mibextid=D4KYlr',
  instagram: 'https://www.instagram.com/tropicanamahuix?igsh=YWk5dDJ6Y2s0Y3ds',
} as const;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

function App() {
  const [serverStatus, setServerStatus] = useState<string>('Verificando conexión...');
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, cartItemCount, isCartOpen, setIsCartOpen } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'licor' | 'torito'>('all');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/health`)
      .then((res) => {
        if (!res.ok) throw new Error('Servidor no responde');
        return res.json();
      })
      .then((data) => setServerStatus(data.message))
      .catch(() => setServerStatus('⚠️ Backend no disponible'));
  }, []);

  return (
    <Routes
      // Habilitar future flags para compatibilidad con React Router v7
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
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
                <div className="flex items-center justify-center gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  <a
                    href={SOCIAL_LINKS.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-orange transition-colors"
                  >
                    Facebook
                  </a>
                  <span className="h-1 w-1 rounded-full bg-brand-orange" aria-hidden="true"></span>
                  <a
                    href={SOCIAL_LINKS.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-orange transition-colors"
                  >
                    Instagram
                  </a>
                </div>
              </div>
            </footer>
          </div>
        }
      />

      <Route
        path="/checkout"
        element={
          <div className="min-h-screen bg-paper font-sans text-stone-900">
            <Navbar cartItemCount={cartItemCount} isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} />
            <CheckoutForm />
            <CartSidebar
              cart={cart}
              isOpen={isCartOpen}
              setIsOpen={setIsCartOpen}
              updateQuantity={updateQuantity}
              removeFromCart={removeFromCart}
              clearCart={clearCart}
            />
          </div>
        }
      />

      <Route
        path="/order-confirmation/:orderId"
        element={
          <div className="min-h-screen bg-paper font-sans text-stone-900">
            <Navbar cartItemCount={cartItemCount} isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} />
            <OrderConfirmation />
          </div>
        }
      />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Suspense fallback={<LoadingFallback />}>
              <AdminDashboard />
            </Suspense>
          </AdminRoute>
        }
      />
    </Routes>
  );
}

export default App;
