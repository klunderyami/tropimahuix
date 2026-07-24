import { useState, type FormEvent } from 'react';

const ContactPage = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      // Aquí puedes integrar con tu API de contacto o formulario
      console.log('Contact form submitted:', form);
      setSuccess('Mensaje enviado correctamente. Te contactaremos pronto.');
      setForm({ name: '', email: '', phone: '', message: '' });
    } catch {
      setError('Error al enviar el mensaje. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-display text-brand-brown mb-4">Contacto</h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto">
            ¿Tienes preguntas o comentarios? Nos encantaría escucharte. Completa el formulario y te responderemos lo antes posible.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-2">
          <div className="glass-card border border-stone-200 bg-white/85 p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">
                  Mensaje
                </label>
                <textarea
                  required
                  rows={6}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 resize-none"
                  placeholder="¿En qué podemos ayudarte?"
                />
              </div>

              {success && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  {success}
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-3xl bg-brand-orange px-6 py-4 text-sm font-bold text-white transition hover:bg-brand-orange/90 disabled:opacity-70"
              >
                {loading ? 'Enviando...' : 'Enviar mensaje'}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="glass-card border border-stone-200 bg-white/85 p-6 shadow-xl">
              <h3 className="text-xl font-display text-brand-brown mb-3">📍 Ubicación</h3>
              <p className="text-stone-600">
                Mahuixtlán, Veracruz<br />
                México
              </p>
            </div>

            <div className="glass-card border border-stone-200 bg-white/85 p-6 shadow-xl">
              <h3 className="text-xl font-display text-brand-brown mb-3">📞 Teléfono</h3>
              <p className="text-stone-600">+52 229 123 4567</p>
            </div>

            <div className="glass-card border border-stone-200 bg-white/85 p-6 shadow-xl">
              <h3 className="text-xl font-display text-brand-brown mb-3">✉️ Email</h3>
              <p className="text-stone-600">contacto@tropicana.com</p>
            </div>

            <div className="glass-card border border-stone-200 bg-white/85 p-6 shadow-xl">
              <h3 className="text-xl font-display text-brand-brown mb-3">🕐 Horario</h3>
              <p className="text-stone-600">
                Lunes a Viernes: 9:00 - 18:00<br />
                Sábados: 10:00 - 14:00
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;