import { Link, useLocation, useParams } from 'react-router-dom';
import type { OrderItem, ShippingAddress } from '../types.js';

interface ConfirmationState {
  orderId?: string;
  total?: number;
  items?: OrderItem[];
  shippingAddress?: ShippingAddress;
  paypalOrderId?: string;
}

export const OrderConfirmation = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const state = (location.state ?? {}) as ConfirmationState;
  const confirmedOrderId = state.orderId ?? orderId ?? 'orden-confirmada';

  return (
    <section className="min-h-screen bg-paper px-4 py-16 sm:px-6 lg:px-8">
      <div className="glass-card mx-auto max-w-4xl border border-brand-gold/20 bg-white/90 p-8 text-center shadow-2xl sm:p-12">
        <p className="text-sm font-bold uppercase tracking-[0.35em] text-brand-orange">Pago confirmado</p>
        <h1 className="mt-5 text-5xl font-display text-brand-brown sm:text-6xl">Gracias por tu compra</h1>
        <p className="mx-auto mt-5 max-w-2xl text-stone-600">
          Tu orden fue validada con PayPal y quedó registrada en el sistema de Tropicaña para preparación y entrega.
        </p>

        <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-stone-200 bg-white p-6 text-left shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400">Orden interna</p>
              <p className="mt-1 break-all font-mono text-sm font-bold text-brand-brown">{confirmedOrderId}</p>
            </div>
            {state.paypalOrderId && (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400">Orden PayPal</p>
                <p className="mt-1 break-all font-mono text-sm font-bold text-brand-brown">{state.paypalOrderId}</p>
              </div>
            )}
          </div>

          {state.items && state.items.length > 0 && (
            <div className="mt-6 space-y-3 border-t border-stone-200 pt-6">
              {state.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold text-stone-700">
                    {item.quantity} x {item.name}
                  </span>
                  <span className="font-bold text-brand-orange">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {typeof state.total === 'number' && (
            <div className="mt-6 flex items-center justify-between border-t border-stone-200 pt-6 text-xl font-black">
              <span>Total pagado</span>
              <span className="text-brand-orange">${state.total.toFixed(2)} MXN</span>
            </div>
          )}

          {state.shippingAddress && (
            <div className="mt-6 rounded-3xl bg-stone-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400">Entrega</p>
              <p className="mt-2 font-semibold text-brand-brown">{state.shippingAddress.name}</p>
              <p className="text-sm text-stone-600">{state.shippingAddress.street}</p>
              <p className="text-sm text-stone-600">{state.shippingAddress.city}</p>
            </div>
          )}
        </div>

        <Link
          to="/"
          className="mt-8 inline-flex rounded-full bg-brand-orange px-8 py-3 text-sm font-bold text-white transition hover:bg-brand-orange/90"
        >
          Volver al catálogo
        </Link>
      </div>
    </section>
  );
};
