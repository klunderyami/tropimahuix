import type { FormEvent } from 'react';
import { useState } from 'react';
import { useAdminAccess } from '../hooks/useAdminAccess.js';
import type { NewProduct } from '../types.js';

interface AdminPanelProps {
  onAddProduct: (product: NewProduct) => void;
}

const initialFormState: NewProduct = {
  name: '',
  description: '',
  category: 'licor',
  price: 0,
  volume: '750ml',
  image: '',
  stock: 0,
};

export const AdminPanel = ({ onAddProduct }: AdminPanelProps) => {
  const { isAdmin, loading } = useAdminAccess();
  const [formState, setFormState] = useState<NewProduct>(initialFormState);

  if (loading || !isAdmin) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.name || !formState.description || !formState.image || formState.price <= 0) {
      return;
    }

    onAddProduct(formState);
    setFormState(initialFormState);
  };

  const handleChange = (field: keyof NewProduct, value: string | number) => {
    setFormState((prevState) => ({
      ...prevState,
      [field]: value,
    }));
  };

  return (
    <section id="admin" className="py-24 bg-[radial-gradient(circle_at_top,_rgba(255,107,0,0.12),transparent_65%)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card border-brand-gold/20 border p-8 shadow-xl">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-orange font-semibold mb-3">Panel de Administración</p>
            <h2 className="text-4xl font-display text-brand-brown">Gestiona tu catálogo en tiempo real</h2>
            <p className="mt-3 text-stone-600 max-w-2xl">
              Añade nuevas botellas, ajusta categorías y enriquece el menú premium de Tropicaña directamente desde aquí.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-stone-700">Nombre del Producto</span>
              <input
                value={formState.name}
                onChange={(event) => handleChange('name', event.target.value)}
                className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                placeholder="Ej. Licor de Mango"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-stone-700">URL de imagen</span>
              <input
                type="url"
                value={formState.image}
                onChange={(event) => handleChange('image', event.target.value)}
                className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                placeholder="https://..."
                required
              />
            </label>

            <label className="space-y-2 lg:col-span-2">
              <span className="text-sm font-semibold text-stone-700">Descripción Técnica</span>
              <textarea
                value={formState.description}
                onChange={(event) => handleChange('description', event.target.value)}
                className="w-full min-h-[140px] rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                placeholder="Notas de sabor, aroma y proceso artesanal"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-stone-700">Precio (MXN)</span>
              <input
                type="number"
                value={formState.price}
                onChange={(event) => handleChange('price', Number(event.target.value))}
                min={1}
                className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-stone-700">Volumen</span>
              <input
                value={formState.volume}
                onChange={(event) => handleChange('volume', event.target.value)}
                className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                placeholder="Ej. 750ml"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-stone-700">Categoría</span>
              <select
                value={formState.category}
                onChange={(event) => handleChange('category', event.target.value)}
                className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                required
              >
                <option value="licor">Licor</option>
                <option value="torito">Torito</option>
              </select>
            </label>

            <div className="lg:col-span-2 flex flex-col gap-4">
              <button
                type="submit"
                className="rounded-3xl bg-brand-orange px-6 py-4 text-sm font-semibold text-white transition hover:bg-brand-orange/90"
              >
                Agregar producto al catálogo
              </button>
              <p className="text-sm text-stone-500">
                El producto se añadirá al catálogo premium al instante y estará disponible para los clientes.
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};
