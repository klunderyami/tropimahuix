import { FormEvent, useMemo, useState } from 'react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase.js';
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
  const { cart, clearCart } = useCart();
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(initialAddress);
  const [preparedOrder, setPreparedOrder] = useState<PreparedOrder | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart],
  );

  const handleAddressChange = (field: keyof ShippingAddress, value: string) => {
    setShippingAddress((current) => ({ ...current, [field]: value }));
    setPreparedOrder(null);
  };

  const handlePrepareOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (cart.length === 0) {
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
          items: cart.map((item) => ({
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

  if (cart.length === 0 && !preparedOrder) {
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
              {isPreparing ? 'Reservando stock...' : 'Reservar pedido y continuar con PayPal'}
            </button>
          </form>

          {error && (
            <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
              {error}
            </div>
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
          <div className="mt-6 space-y-4">
            {cart.map((item) => (
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
            <span className="text-brand-orange">${cartTotal.toFixed(2)} MXN</span>
          </div>
        </aside>
      </div>
    </section>
  );
};
