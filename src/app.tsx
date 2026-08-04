import { useEffect, useState, Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminRoute from './components/AdminRoute.js';
import { CartProvider, useCart } from './contexts/CartContext.js';
import { SiteConfigProvider } from './contexts/SiteConfigContext.js';
import { useRealtimeKeepAlive } from './hooks/useRealtimeKeepAlive.js';
import { useVisitTracker } from './hooks/useVisitTracker.js';
import { Navbar } from './components/Navbar.js';
import { Hero } from './components/Hero.js';
import { Catalog } from './components/Catalog.js';
import HomeCarousel from './components/HomeCarousel.js';
import { CartSidebar } from './components/CartSidebar.js';
import { CheckoutForm } from './components/CheckoutForm.js';
import { OrderConfirmation } from './components/OrderConfirmation.js';
import { MagicLinkHandler } from './components/MagicLinkHandler.js';
import { LoginAdmin } from './components/LoginAdmin.js';
import { VerifyAdminLink } from './components/VerifyAdminLink.js';
import { ProductDetailPage } from './pages/ProductDetailPage.js';
import ContactPage from './pages/ContactPage.js';
import { LicoresPage } from './pages/LicoresPage.js';
import { ToritosPage } from './pages/ToritosPage.js';
import { OrderHistoryPage } from './pages/OrderHistoryPage.js';
import TermsPage from './pages/TermsPage.js';
import PrivacyPage from './pages/PrivacyPage.js';
import GalleryPage from './pages/GalleryPage.js';
import DistributorsSection from './components/DistributorsSection.js';
import FloatingChatWidget from './components/FloatingChatWidget.js';

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

function AppContent() {
  const { totalItems, isCartOpen, setIsCartOpen } = useCart();
  const [serverStatus, setServerStatus] = useState<string>('Verificando conexión...');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'licor' | 'torito'>('all');

  // Mantener viva la suscripción a Realtime de Supabase para evitar idle_shutdown
  useRealtimeKeepAlive();
  
  // Rastrear visitas al sitio
  useVisitTracker();

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/health`)
      .then((res) => {
        if (!res.ok) throw new Error('Servidor no responde');
        return res.json();
      })
      .then((data) => setServerStatus(data.message ?? 'Verificando conexión...'))
      .catch(() => setServerStatus('⚠️ Backend no disponible'));
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div id="home" className="min-h-screen bg-paper font-sans text-stone-900 scroll-smooth selection:bg-brand-orange/20 selection:text-brand-brown">
            <Navbar cartItemCount={totalItems} isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} />

            <main>
              <Hero />

              <HomeCarousel />

              <Catalog
                selectedCategory={selectedCategory}
                onChangeCategory={setSelectedCategory}
              />

              {/* AdminPanel moved to protected /admin route */}

              <DistributorsSection />

              <CartSidebar />
            </main>

            <FloatingChatWidget />

            <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-16 border-t border-stone-200 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="inline-flex items-center gap-3 bg-white px-5 py-2.5 rounded-full shadow-sm border border-stone-200">
                  <span className="flex h-3 w-3 relative">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        (serverStatus ?? '').includes('⚠️') ? 'bg-rose-400' : 'bg-emerald-400'
                      }`}
                    ></span>
                    <span
                      className={`relative inline-flex rounded-full h-3 w-3 ${
                        (serverStatus ?? '').includes('⚠️') ? 'bg-rose-500' : 'bg-emerald-500'
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
            <Navbar cartItemCount={totalItems} isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} />
            <CheckoutForm />
            <CartSidebar />
          </div>
        }
      />

      <Route
        path="/order-confirmation/:orderId"
        element={
          <div className="min-h-screen bg-paper font-sans text-stone-900">
            <Navbar cartItemCount={totalItems} isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} />
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
      <Route path="/auth/magic-link" element={<MagicLinkHandler />} />
      <Route path="/admin/login" element={<LoginAdmin />} />
      <Route path="/admin/verify-link" element={<VerifyAdminLink />} />
      
      {/* Páginas de contenido */}
      <Route path="/producto/:id" element={<ProductDetailPage />} />
      <Route path="/contacto" element={<ContactPage />} />
      <Route path="/licores" element={<LicoresPage />} />
      <Route path="/toritos" element={<ToritosPage />} />
      <Route path="/mis-pedidos" element={<OrderHistoryPage />} />
      <Route path="/terminos" element={<TermsPage />} />
      <Route path="/privacidad" element={<PrivacyPage />} />
      <Route path="/galeria" element={<GalleryPage />} />
    </Routes>
  );
}

function App() {
  return (
    <SiteConfigProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </SiteConfigProvider>
  );
}

export default App;
