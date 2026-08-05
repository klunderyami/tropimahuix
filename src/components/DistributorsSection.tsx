import { useState, FormEvent } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { createDistributorLead } from '../supabase.js';
import type { NewDistributorLead } from '../types.js';

const WHATSAPP_NUMBER = '2288398024';

const DistributorsSection = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<NewDistributorLead>({
    full_name: '',
    phone: '',
    email: '',
    city_state: '',
    business_name: '',
    message: '',
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createDistributorLead(formData);
      toast.success('¡Gracias por tu interés! Te contactaremos pronto.', {
        duration: 5000,
        icon: '🌴',
      });
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        city_state: '',
        business_name: '',
        message: '',
      });
    } catch {
      toast.error('Error al enviar el formulario. Por favor, intenta de nuevo.', {
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent('Hola Tropicaña, quiero información sobre ser distribuidor de sus productos.');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <Toaster position="bottom-center" toastOptions={{ duration: 5000, className: 'font-semibold' }} />
      
      <div className="mx-auto max-w-7xl">
        {/* Encabezado */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-orange/10 px-4 py-2 text-sm font-bold uppercase tracking-wider text-brand-orange">
            <span>🤝</span>
            <span>Oportunidad de Negocio</span>
          </div>
          <h2 className="mt-4 text-4xl font-display font-black text-brand-brown sm:text-5xl">
            ¿Quieres ser distribuidor de bebidas Tropicaña?
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-stone-600">
            Únete a nuestra red de distribuidores y ofrece a tus clientes los mejores licores artesanales y toritos de Veracruz. 
            <span className="font-semibold text-brand-orange">Precios de mayoreo exclusivos</span> y márgenes de ganancia atractivos.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Beneficios */}
          <div className="glass-card rounded-3xl border border-brand-gold/20 bg-white/90 p-8 shadow-xl">
            <h3 className="mb-6 text-2xl font-display font-bold text-brand-brown">
              Beneficios de ser distribuidor
            </h3>
            
            <div className="space-y-4">
              {[
                {
                  icon: '💰',
                  title: 'Precios de mayoreo',
                  description: 'Descuentos exclusivos desde la primera compra',
                },
                {
                  icon: '📈',
                  title: 'Altos márgenes de ganancia',
                  description: 'Gana más con cada venta de nuestros productos',
                },
                {
                  icon: '🚚',
                  title: 'Envíos a todo México',
                  description: 'Logística optimizada para distribuidores',
                },
                {
                  icon: '🎯',
                  title: 'Productos únicos',
                  description: 'Licores artesanales y toritos que no encontrarás en otros lados',
                },
                {
                  icon: '📞',
                  title: 'Soporte dedicado',
                  description: 'Atención personalizada para distribuidores',
                },
              ].map((benefit) => (
                <div key={benefit.title} className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-brand-orange/30 hover:shadow-md">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-2xl">
                    {benefit.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-brand-brown">{benefit.title}</h4>
                    <p className="mt-1 text-sm text-stone-600">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleWhatsAppClick}
              className="mt-6 w-full rounded-full bg-green-600 px-6 py-4 text-sm font-bold text-white transition hover:bg-green-700 hover:shadow-lg"
            >
              📱 Contactar por WhatsApp
            </button>
          </div>

          {/* Formulario */}
          <div className="glass-card rounded-3xl border border-brand-gold/20 bg-white/90 p-8 shadow-xl">
            <div className="mb-6">
              <h3 className="text-2xl font-display font-bold text-brand-brown">
                Solicita información
              </h3>
              <p className="mt-2 text-sm text-stone-600">
                Completa el formulario y nos pondremos en contacto contigo en menos de 24 horas.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="full_name" className="block text-sm font-semibold text-stone-700">
                  Nombre completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="full_name"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                  placeholder="Juan Pérez García"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-stone-700">
                    Teléfono/WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                    placeholder="+52 229 123 4567"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-stone-700">
                    Correo electrónico <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                    placeholder="tropicana1930@gmail.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="city_state" className="block text-sm font-semibold text-stone-700">
                    Ciudad/Estado <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="city_state"
                    required
                    value={formData.city_state}
                    onChange={(e) => setFormData({ ...formData, city_state: e.target.value })}
                    className="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                    placeholder="Veracruz, Ver."
                  />
                </div>

                <div>
                  <label htmlFor="business_name" className="block text-sm font-semibold text-stone-700">
                    Nombre del negocio <span className="text-stone-400">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    className="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                    placeholder="Mi Tiendita"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-stone-700">
                  Mensaje <span className="text-stone-400">(opcional)</span>
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                  placeholder="Cuéntanos más sobre tu negocio y qué productos te interesan..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-brand-orange px-6 py-4 text-sm font-bold text-white transition hover:bg-brand-orange/90 disabled:bg-stone-300 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Enviando...
                  </span>
                ) : (
                  'Solicitar información'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DistributorsSection;