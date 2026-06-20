import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from '../firebase.js';
import { auth, db } from '../firebase.js';
import type { NewProduct, Order, OrderStatus, Product } from '../types.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

const blankProduct: NewProduct = {
  name: '',
  description: '',
  price: 0,
  volume: '750ml',
  image: '',
  category: 'licor',
  stock: 0,
  active: true,
};

const statusLabels: Record<OrderStatus | 'all', string> = {
  all: 'Todas',
  pending: 'Pendientes',
  paid: 'Pagadas',
  failed: 'Fallidas',
  delivered: 'Entregadas',
};

async function getAdminHeaders(): Promise<HeadersInit> {
  const token = await auth.currentUser?.getIdToken();

  if (!token) {
    throw new Error('No hay una sesión administrativa activa.');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function toProduct(id: string, data: Partial<Product>): Product | null {
  if (
    typeof data.name !== 'string' ||
    typeof data.description !== 'string' ||
    typeof data.price !== 'number' ||
    typeof data.volume !== 'string' ||
    typeof data.image !== 'string' ||
    (data.category !== 'licor' && data.category !== 'torito')
  ) {
    return null;
  }

  return {
    id,
    name: data.name,
    description: data.description,
    price: data.price,
    volume: data.volume,
    image: data.image,
    category: data.category,
    stock: typeof data.stock === 'number' ? data.stock : 0,
    active: data.active !== false,
  };
}

function toOrder(id: string, data: Partial<Order>): Order | null {
  if (
    !Array.isArray(data.items) ||
    typeof data.total !== 'number' ||
    (data.status !== 'pending' && data.status !== 'paid' && data.status !== 'failed' && data.status !== 'delivered') ||
    typeof data.shippingAddress !== 'object' ||
    !data.shippingAddress ||
    typeof data.createdAt !== 'string'
  ) {
    return null;
  }

  return {
    id,
    userId: typeof data.userId === 'string' ? data.userId : 'guest',
    items: data.items,
    total: data.total,
    status: data.status,
    shippingAddress: data.shippingAddress,
    paypalOrderId: typeof data.paypalOrderId === 'string' ? data.paypalOrderId : '',
    createdAt: data.createdAt,
  };
}

const AdminDashboard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [formState, setFormState] = useState<NewProduct>(blankProduct);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<OrderStatus | 'all'>('paid');
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const nextProducts = snapshot.docs
        .map((documentSnapshot) => toProduct(documentSnapshot.id, documentSnapshot.data() as Partial<Product>))
        .filter((product): product is Product => product !== null)
        .sort((left, right) => left.name.localeCompare(right.name));

      setProducts(nextProducts);
    });

    const unsubscribeOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
      const nextOrders = snapshot.docs
        .map((documentSnapshot) => toOrder(documentSnapshot.id, documentSnapshot.data() as Partial<Order>))
        .filter((order): order is Order => order !== null);

      setOrders(nextOrders);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
    };
  }, []);

  const filteredOrders = useMemo(
    () => (orderFilter === 'all' ? orders : orders.filter((order) => order.status === orderFilter)),
    [orderFilter, orders],
  );

  const metrics = useMemo(() => {
    const paidOrders = orders.filter((order) => order.status === 'paid' || order.status === 'delivered');
    return {
      activeProducts: products.filter((product) => product.active !== false).length,
      lowStock: products.filter((product) => product.active !== false && product.stock <= 3).length,
      paidOrders: paidOrders.length,
      revenue: paidOrders.reduce((sum, order) => sum + order.total, 0),
    };
  }, [orders, products]);

  const resetForm = () => {
    setEditingProductId(null);
    setFormState(blankProduct);
  };

  const handleProductSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingProduct(true);
    setError(null);
    setNotice(null);

    try {
      const headers = await getAdminHeaders();
      const response = await fetch(
        editingProductId ? `${API_BASE_URL}/api/products/${editingProductId}` : `${API_BASE_URL}/api/products`,
        {
          method: editingProductId ? 'PATCH' : 'POST',
          headers,
          body: JSON.stringify({
            ...formState,
            price: Number(formState.price),
            stock: Number(formState.stock),
          }),
        },
      );

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? 'No se pudo guardar el producto.');
      }

      setNotice(editingProductId ? 'Producto actualizado.' : 'Producto creado.');
      resetForm();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo guardar el producto.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setFormState({
      name: product.name,
      description: product.description,
      price: product.price,
      volume: product.volume,
      image: product.image,
      category: product.category,
      stock: product.stock,
      active: product.active !== false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleArchiveProduct = async (productId: string) => {
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
        method: 'DELETE',
        headers: await getAdminHeaders(),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? 'No se pudo archivar el producto.');
      }

      setNotice('Producto archivado.');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo archivar el producto.');
    }
  };

  const handleOrderStatus = async (orderId: string, status: OrderStatus) => {
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: await getAdminHeaders(),
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? 'No se pudo actualizar la orden.');
      }

      setNotice('Orden actualizada.');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo actualizar la orden.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

  return (
    <main className="min-h-screen bg-paper px-4 py-10 font-sans text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 rounded-[2rem] border border-brand-gold/20 bg-brand-brown px-6 py-7 text-white shadow-2xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-gold">Tropicaña Admin</p>
            <h1 className="mt-3 text-5xl font-display">Operación transaccional</h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-200">
              Gestiona catálogo, inventario y órdenes pagadas desde el backend protegido por Firebase UID.
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
          >
            Cerrar sesión
          </button>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Productos activos', metrics.activeProducts.toString()],
            ['Stock bajo', metrics.lowStock.toString()],
            ['Órdenes pagadas', metrics.paidOrders.toString()],
            ['Ingresos', `$${metrics.revenue.toFixed(2)}`],
          ].map(([label, value]) => (
            <div key={label} className="glass-card border border-stone-200 bg-white/85 p-5 shadow-lg">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400">{label}</p>
              <p className="mt-2 text-3xl font-black text-brand-brown">{value}</p>
            </div>
          ))}
        </section>

        {(notice || error) && (
          <div
            className={`mb-8 rounded-3xl border px-5 py-4 text-sm font-bold ${
              error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {error ?? notice}
          </div>
        )}

        <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="glass-card h-fit border border-brand-gold/20 bg-white/90 p-6 shadow-xl">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-orange">Catálogo</p>
              <h2 className="mt-2 text-4xl font-display text-brand-brown">
                {editingProductId ? 'Editar botella' : 'Nuevo producto'}
              </h2>
            </div>

            <form onSubmit={handleProductSubmit} className="grid gap-4">
              <input
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                placeholder="Nombre"
                required
                className="rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
              />
              <textarea
                value={formState.description}
                onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                placeholder="Descripción"
                required
                className="min-h-28 rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  value={formState.price}
                  onChange={(event) => setFormState((current) => ({ ...current, price: Number(event.target.value) }))}
                  placeholder="Precio"
                  required
                  className="rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={formState.stock}
                  onChange={(event) => setFormState((current) => ({ ...current, stock: Number(event.target.value) }))}
                  placeholder="Stock"
                  required
                  className="rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  value={formState.volume}
                  onChange={(event) => setFormState((current) => ({ ...current, volume: event.target.value }))}
                  placeholder="Volumen"
                  required
                  className="rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                />
                <select
                  value={formState.category}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      category: event.target.value === 'torito' ? 'torito' : 'licor',
                    }))
                  }
                  className="rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                >
                  <option value="licor">Licor</option>
                  <option value="torito">Torito</option>
                </select>
              </div>
              <input
                type="url"
                value={formState.image}
                onChange={(event) => setFormState((current) => ({ ...current, image: event.target.value }))}
                placeholder="URL de imagen"
                required
                className="rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
              />
              <div className="flex items-center gap-3">
                <input
                  id="product-active"
                  type="checkbox"
                  checked={formState.active !== false}
                  onChange={(event) => setFormState((current) => ({ ...current, active: event.target.checked }))}
                  className="h-5 w-5 accent-brand-orange"
                />
                <label htmlFor="product-active" className="text-sm font-semibold text-stone-700">
                  Visible en catálogo
                </label>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="flex-1 rounded-3xl bg-brand-orange px-6 py-4 text-sm font-bold text-white transition hover:bg-brand-orange/90 disabled:bg-stone-300"
                >
                  {isSavingProduct ? 'Guardando...' : editingProductId ? 'Actualizar producto' : 'Crear producto'}
                </button>
                {editingProductId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-3xl border border-stone-300 px-6 py-4 text-sm font-bold text-stone-700 hover:bg-stone-100"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="glass-card border border-stone-200 bg-white/90 p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-orange">Inventario</p>
                <h2 className="mt-2 text-4xl font-display text-brand-brown">Productos</h2>
              </div>
            </div>
            <div className="grid gap-4">
              {products.map((product) => (
                <article key={product.id} className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm lg:grid-cols-[96px_1fr_auto]">
                  <img src={product.image} alt={product.name} className="h-24 w-24 rounded-2xl object-cover" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-brand-brown">{product.name}</h3>
                      <span className="rounded-full bg-brand-lime px-3 py-1 text-xs font-bold text-brand-brown">{product.category}</span>
                      {product.active === false && (
                        <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-bold text-stone-600">Archivado</span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-stone-500">{product.description}</p>
                    <p className="mt-2 text-sm font-bold text-stone-700">
                      ${product.price.toFixed(2)} MXN · {product.volume} · Stock {product.stock}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 lg:flex-col lg:items-stretch">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="rounded-full bg-brand-brown px-4 py-2 text-xs font-bold text-white hover:bg-brand-brown/90"
                    >
                      Editar
                    </button>
                    {product.active !== false && (
                      <button
                        onClick={() => handleArchiveProduct(product.id)}
                        className="rounded-full border border-rose-200 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                      >
                        Archivar
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="glass-card mt-8 border border-brand-gold/20 bg-white/90 p-6 shadow-xl">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-orange">Fulfillment</p>
              <h2 className="mt-2 text-4xl font-display text-brand-brown">Órdenes</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'pending', 'paid', 'delivered'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setOrderFilter(status)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                    orderFilter === status ? 'bg-brand-orange text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {filteredOrders.length === 0 ? (
              <div className="rounded-3xl border border-stone-200 bg-stone-50 p-8 text-center text-sm font-semibold text-stone-500">
                No hay órdenes en este estado.
              </div>
            ) : (
              filteredOrders.map((order) => (
                <article key={order.id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-all font-mono text-sm font-black text-brand-brown">{order.id}</h3>
                        <span className="rounded-full bg-brand-lime px-3 py-1 text-xs font-bold text-brand-brown">
                          {statusLabels[order.status]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-stone-600">
                        {order.shippingAddress.name} · {order.shippingAddress.phone} · {order.shippingAddress.city}
                      </p>
                      <p className="mt-1 text-xs text-stone-400">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="text-2xl font-black text-brand-orange">${order.total.toFixed(2)}</p>
                      {order.paypalOrderId && <p className="break-all font-mono text-xs text-stone-400">{order.paypalOrderId}</p>}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 border-t border-stone-200 pt-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 text-sm">
                        <span className="font-semibold text-stone-700">
                          {item.quantity} x {item.name}
                        </span>
                        <span className="font-bold text-brand-brown">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleOrderStatus(order.id, 'paid')}
                      disabled={order.status === 'paid'}
                      className="rounded-full bg-brand-brown px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-brown/90 disabled:cursor-not-allowed disabled:bg-stone-300"
                    >
                      Marcar pagada
                    </button>
                    <button
                      onClick={() => handleOrderStatus(order.id, 'delivered')}
                      disabled={order.status === 'delivered'}
                      className="rounded-full bg-brand-orange px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-orange/90 disabled:cursor-not-allowed disabled:bg-stone-300"
                    >
                      Marcar entregada
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default AdminDashboard;
