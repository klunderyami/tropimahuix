import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.js';
import AdminRoute from './components/AdminRoute.js';
import { SiteConfigProvider } from './contexts/SiteConfigContext.js';
import { useRealtimeKeepAlive } from './hooks/useRealtimeKeepAlive.js';

const HomePage = lazy(() => import('./components/HomePage.js'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard.js'));
const ProductMediaGallery = lazy(() => import('./pages/ProductMediaGallery.js'));
const VerifyAdminLink = lazy(() => import('./components/VerifyAdminLink.js').then(m => ({ default: m.VerifyAdminLink })));
const MagicLinkHandler = lazy(() => import('./components/MagicLinkHandler.js').then(m => ({ default: m.MagicLinkHandler })));
const CheckoutPage = lazy(() => import('./components/CheckoutForm.js').then(m => ({ default: m.CheckoutForm })));
const OrderConfirmationPage = lazy(() => import('./components/OrderConfirmation.js').then(m => ({ default: m.OrderConfirmation })));

const SuspenseFallback = () => (
  <div className="flex h-[calc(100vh-80px)] w-full items-center justify-center bg-paper">
    <div className="flex items-center gap-4">
      <svg className="animate-spin h-8 w-8 text-brand-orange" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span className="text-xl font-semibold text-stone-700">Cargando...</span>
    </div>
  </div>
);

// Un componente simple para envolver y proveer el contexto de autenticación
const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // En una app real, aquí iría la lógica del AuthContext.Provider
  return <>{children}</>;
};

// Componente wrapper que provee todos los contextos necesarios
const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      <SiteConfigProvider>
        {children}
      </SiteConfigProvider>
    </AuthProvider>
  );
};

function App() {
  // Este hook mantiene viva la conexión con Supabase.
  useRealtimeKeepAlive();

  return (
    <AppProviders>
      <Navbar />
      <Suspense fallback={<SuspenseFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
          <Route path="/galeria" element={<ProductMediaGallery />} />
          <Route path="/magic-link-handler" element={<MagicLinkHandler />} />
          <Route
            path="/admin/*"
            element={<AdminRoute><AdminDashboard /></AdminRoute>}
          />
          <Route path="/admin/verify-link" element={<VerifyAdminLink />} />
          {/* Aquí puedes agregar otras rutas como detalles de producto, carrito, etc. */}
        </Routes>
      </Suspense>
    </AppProviders>
  );
}

export default App;