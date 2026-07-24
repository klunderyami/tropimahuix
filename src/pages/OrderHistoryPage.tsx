import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase.js';
import type { Order } from '../types.js';

export const OrderHistoryPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ uid: string; email: string | null } | null>(null);

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

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;

        const response = await fetch('/api/orders', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setOrders(data.orders || []);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-6xl">🔒</div>
          <h1 className="text-3xl font-display text-brand-brown mb-4">Inicia sesión</h1>
          <p className="text-stone-600 mb-8">Debes iniciar sesión para ver tu historial de pedidos.</p>
          <Link to="/" className="btn-primary">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">🌴</div>
          <p className="text-stone-600 font-medium">Cargando historial...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      case 'failed': return 'bg-rose-100 text-rose-800';
      default: return 'bg-stone-100 text-stone-800';
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'paid': return 'Pagado';
      case 'delivered': return 'Entregado';
      case 'failed': return 'Fallido';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-paper py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-display text-brand-brown mb-4">Mis Pedidos</h1>
          <p className="text-lg text-stone-600">Historial de tus compras en Tropicaña</p>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-4 text-6xl">📦</div>
            <h2 className="text-2xl font-display text-brand-brown mb-4">No tienes pedidos aún</h2>
            <p className="text-stone-600 mb-8">Explora nuestro catálogo y realiza tu primera compra.</p>
            <Link to="/" className="btn-primary">
              Ver catálogo
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="glass-card border border-stone-200 bg-white/85 p-6 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div>
                    <p className="text-sm text-stone-500">Pedido #{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-stone-400">
                      {new Date(order.createdAt).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className={`inline-block rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                <div className="border-t border-stone-200 pt-4">
                  <div className="space-y-2 mb-4">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-stone-700">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="font-semibold text-brand-brown">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center border-t border-stone-200 pt-3">
                    <span className="text-lg font-bold text-brand-brown">Total</span>
                    <span className="text-2xl font-extrabold text-brand-orange">
                      ${order.total.toFixed(2)} MXN
                    </span>
                  </div>
                </div>

                <div className="mt-4 text-sm text-stone-600">
                  <p className="font-semibold">Envío a:</p>
                  <p>{order.shippingAddress.name}</p>
                  <p>{order.shippingAddress.street}</p>
                  <p>{order.shippingAddress.city}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};