const TermsPage = () => {
  return (
    <div className="min-h-screen bg-paper py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-display text-brand-brown mb-8 text-center">Términos y Condiciones</h1>
        
        <div className="glass-card border border-stone-200 bg-white/85 p-8 shadow-xl space-y-6 text-stone-700">
          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">1. Aceptación de los términos</h2>
            <p className="leading-relaxed">
              Al acceder y utilizar este sitio web, aceptas cumplir con estos términos y condiciones de uso. Si no estás de acuerdo con alguna parte de estos términos, no debes utilizar nuestro sitio web.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">2. Productos y precios</h2>
            <p className="leading-relaxed">
              Todos los productos mostrados en nuestro catálogo están sujetos a disponibilidad. Nos reservamos el derecho de modificar precios, descripciones y disponibilidad de productos en cualquier momento sin previo aviso.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">3. Proceso de compra</h2>
            <p className="leading-relaxed">
              Al realizar una compra, te comprometes a proporcionar información de pago y envío válida. El pago se procesa a través de PayPal u otros métodos autorizados. Tu pedido no se procesará hasta que se confirme el pago.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">4. Envíos y entregas</h2>
            <p className="leading-relaxed">
              Los tiempos de entrega son estimados y pueden variar según la ubicación y disponibilidad del producto. No nos hacemos responsables de retrasos causados por factores externos como condiciones climáticas o problemas de paquetería.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">5. Devoluciones y reembolsos</h2>
            <p className="leading-relaxed">
              Aceptamos devoluciones dentro de los 30 días posteriores a la entrega, siempre que el producto esté en su estado original. Los gastos de envío de devolución corren por cuenta del cliente, a menos que el producto sea defectuoso.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">6. Uso del sitio web</h2>
            <p className="leading-relaxed">
              Te comprometes a utilizar este sitio web de manera responsable y legal. No está permitido utilizar el sitio para fines fraudulentos, distribuir malware o realizar actividades que puedan dañar la funcionalidad del sitio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">7. Propiedad intelectual</h2>
            <p className="leading-relaxed">
              Todo el contenido de este sitio web, incluyendo textos, imágenes, logotipos y diseños, es propiedad de Tropicaña y está protegido por leyes de propiedad intelectual. No está permitida su reproducción sin autorización escrita.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">8. Limitación de responsabilidad</h2>
            <p className="leading-relaxed">
              Tropicaña no será responsable de daños indirectos, incidentales o consecuentes derivados del uso o la imposibilidad de uso de nuestros productos o servicios.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">9. Modificaciones de los términos</h2>
            <p className="leading-relaxed">
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación en el sitio web. Te recomendamos revisar periódicamente estos términos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">10. Contacto</h2>
            <p className="leading-relaxed">
              Si tienes preguntas sobre estos términos y condiciones, puedes contactarnos en:
              <br />
              Email: contacto@tropicana.com
              <br />
              Teléfono: +52 229 123 4567
            </p>
          </section>

          <p className="text-sm text-stone-500 text-center pt-6 border-t border-stone-200">
            Última actualización: {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;