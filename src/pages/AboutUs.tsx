import { useState, type FormEvent } from 'react';

type DistribuidorForm = {
  nombre_completo: string;
  nombre_negocio: string;
  telefono: string;
  email: string;
  estado: string;
  ciudad: string;
  mensaje: string;
};

const initialForm: DistribuidorForm = {
  nombre_completo: '',
  nombre_negocio: '',
  telefono: '',
  email: '',
  estado: '',
  ciudad: '',
  mensaje: '',
};

const AboutUs = () => {
  const [form, setForm] = useState<DistribuidorForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateField = (field: keyof DistribuidorForm) => (value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/distribuidores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = typeof data?.error === 'string' ? data.error : 'No pudimos procesar tu solicitud. Intenta de nuevo.';
        throw new Error(message);
      }

      setSuccessMessage(data.message || 'Tu solicitud fue enviada correctamente.');
      setForm(initialForm);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado. Intenta más tarde.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-paper">
      {/* Hero de la sección */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="font-script text-4xl font-bold text-brand-brown sm:text-5xl lg:text-6xl">
              Acerca de Nosotros
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-600">
              Tradición artesanal, ingredientes selectos y el alma de Mahuixtlán en cada botella.
            </p>
          </div>
        </div>
      </section>

      {/* Misión y Visión */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="glass-card p-8">
            <h2 className="font-script text-3xl font-bold text-brand-brown">Misión</h2>
            <p className="mt-4 text-stone-700 leading-relaxed">
              Elaborar licores y destilados artesanales de alta calidad que reflejen el sabor auténtico de nuestra tierra,
              rescatando recetas tradicionales y apoyando a productores locales. Queremos que cada experiencia con Tropicaña
              acerque a las personas a la riqueza cultural y natural de Mahuixtlán, Veracruz.
            </p>
          </div>
          <div className="glass-card p-8">
            <h2 className="font-script text-3xl font-bold text-brand-brown">Visión</h2>
            <p className="mt-4 text-stone-700 leading-relaxed">
              Ser la marca referente de licores artesanales mexicanos, reconocida por su calidad, innovación responsable y
              compromiso con el desarrollo de la región. Buscamos crecer junto a nuestros distribuidores para llevar el
              sabor de Tropicaña a nuevos mercados sin perder nuestra esencia.
            </p>
          </div>
        </div>
      </section>

      {/* Esencia de la marca */}
      <section className="bg-white/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-script text-3xl font-bold text-brand-brown sm:text-4xl">
                Nuestra esencia
              </h2>
              <p className="mt-4 text-stone-700 leading-relaxed">
                Nacimos en Mahuixtlán, Veracruz, donde la caña, la fruta y la tradición se encuentran para crear productos
                con carácter. Desde nuestros clásicos Toritos hasta licores de frutas y destilados de caña, cada lote se
                trabaja con dedicación artesanal, controlando la calidad desde la selección de materias primas hasta el
                empaque final.
              </p>
              <p className="mt-4 text-stone-700 leading-relaxed">
                Creemos en el comercio justo, en el trabajo colaborativo y en construir relaciones duraderas con quienes
                comparten nuestra pasión por productos bien hechos. Por eso abrimos esta convocatoria para nuevos
                distribuidores que quieran sumarse a la familia Tropicaña.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-brand-gold/20 bg-paper p-6 text-center shadow-sm">
                <p className="text-3xl font-bold text-brand-orange">100%</p>
                <p className="mt-2 text-sm font-semibold text-stone-700">Artesanal</p>
              </div>
              <div className="rounded-2xl border border-brand-gold/20 bg-paper p-6 text-center shadow-sm">
                <p className="text-3xl font-bold text-brand-orange">México</p>
                <p className="mt-2 text-sm font-semibold text-stone-700">Origen veracruzano</p>
              </div>
              <div className="rounded-2xl border border-brand-gold/20 bg-paper p-6 text-center shadow-sm">
                <p className="text-3xl font-bold text-brand-orange">Calidad</p>
                <p className="mt-2 text-sm font-semibold text-stone-700">Controlada en cada lote</p>
              </div>
              <div className="rounded-2xl border border-brand-gold/20 bg-paper p-6 text-center shadow-sm">
                <p className="text-3xl font-bold text-brand-orange">Comunidad</p>
                <p className="mt-2 text-sm font-semibold text-stone-700">Alianzas duraderas</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección Distribuidores */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-script text-3xl font-bold text-brand-brown sm:text-4xl">
              Sé distribuidor
            </h2>
            <p className="mt-4 text-stone-700 leading-relaxed">
              Si tienes un negocio y quieres distribuir productos Tropicaña, completa el formulario. Nuestro equipo
              revisará tu solicitud y se pondrá en contacto contigo para continuar el proceso.
            </p>
            <ul className="mt-6 space-y-3 text-stone-700">
              <li className="flex items-start gap-2">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-brand-orange" />
                <span>Catálogo con productos de alta rotación.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-brand-orange" />
                <span>Acompañamiento comercial y apoyo en punto de venta.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-brand-orange" />
                <span>Condiciones competitivas y disponibilidad regional.</span>
              </li>
            </ul>
          </div>

          <div className="glass-card p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-semibold text-stone-700" htmlFor="nombre_completo">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  id="nombre_completo"
                  type="text"
                  required
                  value={form.nombre_completo}
                  onChange={event => updateField('nombre_completo')(event.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-800 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                  placeholder="Ej. María López Hernández"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-stone-700" htmlFor="nombre_negocio">
                  Nombre del negocio
                </label>
                <input
                  id="nombre_negocio"
                  type="text"
                  value={form.nombre_negocio}
                  onChange={event => updateField('nombre_negocio')(event.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-800 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                  placeholder="Ej. Licorería El Paraíso"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-stone-700" htmlFor="telefono">
                    Teléfono / WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="telefono"
                    type="tel"
                    required
                    value={form.telefono}
                    onChange={event => updateField('telefono')(event.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-800 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                    placeholder="Ej. 2291234567"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-stone-700" htmlFor="email">
                    Correo electrónico <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={event => updateField('email')(event.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-800 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                    placeholder="contacto@tunegocio.com"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-stone-700" htmlFor="estado">
                    Estado <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="estado"
                    type="text"
                    required
                    value={form.estado}
                    onChange={event => updateField('estado')(event.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-800 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                    placeholder="Ej. Veracruz"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-stone-700" htmlFor="ciudad">
                    Ciudad <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="ciudad"
                    type="text"
                    required
                    value={form.ciudad}
                    onChange={event => updateField('ciudad')(event.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-800 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                    placeholder="Ej. Mahuixtlán"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-stone-700" htmlFor="mensaje">
                  Mensaje
                </label>
                <textarea
                  id="mensaje"
                  rows={4}
                  value={form.mensaje}
                  onChange={event => updateField('mensaje')(event.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-800 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                  placeholder="Cuéntanos sobre tu negocio, puntos de venta y expectativas..."
                />
              </div>

              {successMessage && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  {successMessage}
                </div>
              )}

              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-70"
              >
                {loading ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;