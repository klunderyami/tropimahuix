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
import { Footer } from './components/Footer.js';
import { getGalleryPhotos } from './supabase.js';
import type { GalleryPhoto } from './types.js';

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

// En producción, usar rutas relativas para evitar contenido mixto (HTTP vs HTTPS)
// En desarrollo, usar la URL del backend si está definida
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

function AppContent() {
  const { totalItems, isCartOpen, setIsCartOpen } = useCart();
  const [, setServerStatus] = useState<string>('Verificando conexión...');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'licor' | 'torito'>('all');
  const [galleryImages, setGalleryImages] = useState<GalleryPhoto[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);

  // Mantener viva la suscripción a Realtime de Supabase para evitar idle_shutdown
  useRealtimeKeepAlive();
  
  // Rastrear visitas al sitio
  useVisitTracker();

  useEffect(() => {
    // En producción (dominio de Render), usar ruta relativa para evitar contenido mixto
    // En desarrollo, usar la URL completa del backend
    const healthUrl = API_BASE_URL 
      ? `${API_BASE_URL}/api/health` 
      : '/api/health';
    
    fetch(healthUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Servidor no responde');
        return res.json();
      })
      .then((data) => setServerStatus(data.message ?? 'Verificando conexión...'))
      .catch(() => setServerStatus('⚠️ Backend no disponible'));
  }, []);

  // Cargar imágenes de la galería para la sección "Nuestra Esencia"
  useEffect(() => {
    getGalleryPhotos()
      .then((photos) => {
        // Filtrar solo imágenes (no videos)
        const imagesOnly = photos.filter(p => !p.url.match(/\.(mp4|webm|mov)$/i));
        setGalleryImages(imagesOnly.slice(0, 4)); // Usar máximo 4 imágenes
      })
      .catch(() => {
        // Error silencioso - el componente maneja el estado de loading
      })
      .finally(() => setLoadingGallery(false));
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

              <section className="py-24 bg-white relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="grid gap-12 lg:grid-cols-2 items-center">
                    <div className="space-y-6">
                      <h2 className="text-4xl md:text-5xl font-display font-black text-brand-brown">
                        Nuestra Esencia
                      </h2>
                      <p className="text-lg text-stone-600 leading-relaxed">
                        En <span className="font-semibold text-brand-orange">Tropicaña</span>, cada botella cuenta una historia de tradición y pasión. Desde Mahuixtlán, Veracruz, elaboramos nuestros licores y toritos con recetas heredadas por generaciones, utilizando solo ingredientes naturales de la región.
                      </p>
                      <p className="text-base text-stone-500 leading-relaxed">
                        Frutas frescas, café veracruzano, vainilla natural y el secreto mejor guardado: el amor por lo artesanal. Cada producto es una obra maestra única, elaborada en pequeños lotes para garantizar la máxima calidad.
                      </p>
                      <div className="flex flex-wrap gap-4 pt-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-brand-brown">
                          <span className="text-2xl">🍊</span>
                          <span>Frutas Frescas</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-brand-brown">
                          <span className="text-2xl">☕</span>
                          <span>Café Veracruzano</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-brand-brown">
                          <span className="text-2xl">🌿</span>
                          <span>Vainilla Natural</span>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      {loadingGallery ? (
                        <div className="grid grid-cols-2 gap-4">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="aspect-square rounded-2xl bg-stone-200 animate-pulse" />
                          ))}
                        </div>
                      ) : galleryImages.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                          {galleryImages.map((photo) => (
                            <div key={photo.id} className="aspect-square rounded-2xl overflow-hidden bg-stone-50 shadow-lg">
                              <img
                                src={photo.url}
                                alt={photo.label || 'Galería Tropicaña'}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center justify-center rounded-2xl bg-white shadow-lg p-6">
                            <span className="text-6xl">🍋</span>
                          </div>
                          <div className="flex items-center justify-center rounded-2xl bg-white shadow-lg p-6">
                            <span className="text-6xl">🥭</span>
                          </div>
                          <div className="flex items-center justify-center rounded-2xl bg-white shadow-lg p-6">
                            <span className="text-6xl">🍌</span>
                          </div>
                          <div className="flex items-center justify-center rounded-2xl bg-white shadow-lg p-6">
                            <span className="text-6xl">🫘</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <Catalog
                selectedCategory={selectedCategory}
                onChangeCategory={setSelectedCategory}
              />

              <DistributorsSection />

              <CartSidebar />
            </main>

            <FloatingChatWidget />

            <Footer />
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
