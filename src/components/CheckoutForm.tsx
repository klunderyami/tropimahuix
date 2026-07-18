import { FormEvent, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { Link, useNavigate } from 'react-router-dom';
import { auth, login, sendLoginLink } from '../firebase.js';
import { useCart } from '../contexts/CartContext.js';
import type { OrderItem, ShippingAddress } from '../types.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;

interface PreparedOrder {
  orderId: string;
  total: number;
  items: OrderItem[];
}

const initialAddress: ShippingAddress = {
  name: '',
  email: '',
  phone: '',
  street: '',
  city: '',
};

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const CheckoutForm = () => {
  const navigate = useNavigate();
  const { cartItems, clearCart, totalPrice } = useCart();
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(initialAddress);
  const [preparedOrder, setPreparedOrder] = useState<PreparedOrder | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de autenticación para el flujo de registro
  const [user, setUser] = useState<{ uid: string; email: string | null } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setUser({ uid: fbUser.uid, email: fbUser.email });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAddressChange = (field: keyof ShippingAddress, value: string) => {
    setShippingAddress((current) => ({ ...current, [field]: value }));
    setPreparedOrder(null);
  };

  const handlePrepareOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    // Verificar si el usuario está autenticado
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (cartItems.length === 0) {
      setError('Tu carrito está vacío.');
      return;
    }

    setIsPreparing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            id: item.product.id,
            quantity: item.quantity,
          })),
          shippingAddress,
        }),
      });

      const payload = (await response.json()) as PreparedOrder | { error?: string };

      if (!response.ok) {
        throw new Error('error' in payload && payload.error ? payload.error : 'No se pudo preparar la orden.');
      }

      setPreparedOrder(payload as PreparedOrder);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo preparar la orden.');
    } finally {
      setIsPreparing(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      await login();
      // onAuthStateChanged se encargará de actualizar el estado
      setShowAuthModal(false);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Error al iniciar sesión.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);
    if (!authEmail) {
      setAuthError('Por favor ingresa tu correo.');
      setAuthSubmitting(false);
      return;
    }
    try {
      await sendLoginLink(authEmail);
      window.localStorage.setItem('emailForSignIn', authEmail);
      setEmailSent(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Error al enviar enlace.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleCapture = async (paypalOrderId: string) => {
    if (!preparedOrder) return;

    setIsCapturing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({
          orderId: preparedOrder.orderId,
          paypalOrderId,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? 'PayPal no pudo validar el pago.');
      }

      clearCart();
      navigate(`/order-confirmation/${preparedOrder.orderId}`, {
        state: {
          orderId: preparedOrder.orderId,
          total: preparedOrder.total,
          items: preparedOrder.items,
          shippingAddress,
          paypalOrderId,
        },
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo confirmar el pago.');
    } finally {
      setIsCapturing(false);
    }
  };

  if (cartItems.length === 0 && !preparedOrder) {
    return (
      <section className="min-h-screen bg-paper px-4 py-20">
        <div className="glass-card mx-auto max-w-2xl border border-stone-200 bg-white/85 p-10 text-center shadow-xl">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-brand-orange">Checkout</p>
          <h1 className="mt-4 text-5xl font-display text-brand-brown">Tu carrito está vacío</h1>
          <p className="mt-4 text-stone-600">Agrega tus licores o toritos favoritos antes de continuar.</p>
          <Link to="/" className="mt-8 inline-flex rounded-full bg-brand-orange px-8 py-3 text-sm font-bold text-white hover:bg-brand-orange/90">
            Volver al catálogo
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-paper px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-card border border-brand-gold/20 bg-white/85 p-8 shadow-xl">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-brand-orange">Pago seguro con PayPal</p>
          <h1 className="mt-4 text-5xl font-display text-brand-brown">Finaliza tu pedido</h1>
          <p className="mt-3 text-stone-600">
            Capturamos tus datos de entrega y validamos el pago directamente con PayPal antes de confirmar la orden.
          </p>

          <form onSubmit={handlePrepareOrder} className="mt-8 grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold text-stone-700">Nombre completo</span>
              <input
                value={shippingAddress.name}
                onChange={(event) => handleAddressChange('name', event.target.value)}
                required
                minLength={2}
                className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-stone-700">Correo</span>
              <input
                type="email"
                value={shippingAddress.email}
                onChange={(event) => handleAddressChange('email', event.target.value)}
                required
                className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-stone-700">Teléfono</span>
              <input
                value={shippingAddress.phone}
                onChange={(event) => handleAddressChange('phone', event.target.value)}
                required
                minLength={8}
                className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
              />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold text-stone-700">Calle, número y referencias</span>
              <input
                value={shippingAddress.street}
                onChange={(event) => handleAddressChange('street', event.target.value)}
                required
                minLength={4}
                className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
              />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold text-stone-700">Ciudad</span>
              <input
                value={shippingAddress.city}
                onChange={(event) => handleAddressChange('city', event.target.value)}
                required
                minLength={2}
                className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
              />
            </label>

            <button
              type="submit"
              disabled={isPreparing}
              className="sm:col-span-2 rounded-3xl bg-brand-orange px-6 py-4 text-sm font-bold text-white transition hover:bg-brand-orange/90 disabled:cursor-wait disabled:bg-stone-300"
            >
              {isPreparing ? 'Reservando stock...' : user ? 'Reservar pedido y continuar con PayPal' : 'Iniciar sesión y continuar'}
            </button>
          </form>

          {error && (
            <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* MODAL DE AUTENTICACIÓN */}
          {showAuthModal && (
            <>
              {/* Overlay */}
              <div
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                onClick={() => setShowAuthModal(false)}
              />

              {/* Modal */}
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                  className="relative mx-auto w-full max-w-md rounded-[2rem] border border-stone-200 bg-white p-8 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setShowAuthModal(false)}
                    className="absolute right-5 top-5 text-2xl text-stone-400 hover:text-stone-600"
                    aria-label="Cerrar"
                  >
                    &times;
                  </button>

                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-orange">
                      Registro rápido
                    </p>
                    <h3 className="mt-3 text-3xl font-display text-brand-brown">
                      Crea tu cuenta
                    </h3>
                    <p className="mt-2 text-sm text-stone-600">
                      Necesitas una cuenta para procesar tu pedido. Tus datos quedarán vinculados a tu historial de compras.
                    </p>
                  </div>

                  <div className="mt-6 space-y-4">
                    {/* Google Login */}
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={authSubmitting}
                      className="flex w-full items-center justify-center gap-3 rounded-3xl border border-stone-300 bg-white px-6 py-4 text-sm font-bold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Continuar con Google
                    </button>

                    {/* Separador */}
                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-stone-200"></div>
                      <span className="mx-4 text-xs font-semibold text-stone-400">O</span>
                      <div className="flex-grow border-t border-stone-200"></div>
                    </div>

                    {/* Magic Link: Passwordless Email */}
                    {!emailSent ? (
                      <form onSubmit={handleMagicLink} className="space-y-3">
                        <input
                          type="email"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder="tu@correo.com"
                          required
                          className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                        />
                        <button
                          type="submit"
                          disabled={authSubmitting}
                          className="w-full rounded-3xl bg-brand-brown px-6 py-4 text-sm font-bold text-white transition hover:bg-brand-brown/90 disabled:opacity-50"
                        >
                          {authSubmitting ? 'Enviando...' : 'Enviar enlace mágico al correo'}
                        </button>
                        <p className="text-center text-xs text-stone-400">
                          Te enviaremos un enlace para iniciar sesión sin contraseña.
                        </p>
                      </form>
                    ) : (
                      <div className="rounded-3xl bg-emerald-50 p-5 text-center">
                        <p className="text-sm font-bold text-emerald-700">✅ Enlace enviado</p>
                        <p className="mt-1 text-xs text-emerald-600">
                          Revisa tu bandeja de entrada para iniciar sesión.
                        </p>
                      </div>
                    )}

                    {authError && (
                      <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                        {authError}
                      </div>
                    )}
                  </div>

                  <p className="mt-6 text-center text-xs text-stone-400">
                    Al continuar, aceptas que tu pedido quede vinculado a tu cuenta.
                    Puedes consultar tu historial de compras en cualquier momento.
                  </p>
                </div>
              </div>
            </>
          )}

          {preparedOrder && (
            <div className="mt-8 rounded-3xl border border-brand-gold/30 bg-white p-5 shadow-sm">
              <p className="mb-4 text-sm font-semibold text-stone-600">
                Orden interna <span className="font-mono text-brand-brown">{preparedOrder.orderId}</span> lista para pago.
              </p>

              {!PAYPAL_CLIENT_ID ? (
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Configura VITE_PAYPAL_CLIENT_ID para activar los botones de PayPal.
                </div>
              ) : (
                <PayPalScriptProvider
                  options={{
                    clientId: PAYPAL_CLIENT_ID,
                    currency: 'MXN',
                    intent: 'capture',
                  }}
                >
                  <PayPalButtons
                    style={{ layout: 'vertical', color: 'gold', shape: 'pill', label: 'pay' }}
                    disabled={isCapturing}
                    forceReRender={[preparedOrder.orderId, preparedOrder.total]}
                    createOrder={(_data, actions) =>
                      actions.order.create({
                        intent: 'CAPTURE',
                        purchase_units: [
                          {
                            reference_id: preparedOrder.orderId,
                            amount: {
                              currency_code: 'MXN',
                              value: preparedOrder.total.toFixed(2),
                            },
                          },
                        ],
                      })
                    }
                    onApprove={async (data) => {
                      await handleCapture(data.orderID);
                    }}
                    onError={(paypalError) => {
                      setError(paypalError instanceof Error ? paypalError.message : 'PayPal no pudo completar el pago.');
                    }}
                  />
                </PayPalScriptProvider>
              )}
            </div>
          )}
        </div>

        <aside className="glass-card h-fit border border-stone-200 bg-white/85 p-8 shadow-xl">
          <h2 className="text-3xl font-display text-brand-brown">Resumen</h2>
          {user && (
            <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-3 text-center text-xs font-semibold text-emerald-700">
              ✅ Cuenta activa: {user.email || user.uid.slice(0, 8)}
            </div>
          )}
          <div className="mt-6 space-y-4">
            {cartItems.map((item) => (
              <div key={item.product.id} className="flex gap-4 rounded-3xl border border-stone-200 bg-white p-4">
                <img src={item.product.image} alt={item.product.name} className="h-20 w-20 rounded-2xl object-cover" />
                <div className="flex-1">
                  <p className="font-bold text-brand-brown">{item.product.name}</p>
                  <p className="text-sm text-stone-500">
                    {item.quantity} x ${item.product.price.toFixed(2)}
                  </p>
                </div>
                <p className="font-bold text-brand-orange">${(item.product.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-stone-200 pt-6 text-xl font-black">
            <span>Total</span>
            <span className="text-brand-orange">${totalPrice.toFixed(2)} MXN</span>
          </div>
        </aside>
      </div>
    </section>
  );
};