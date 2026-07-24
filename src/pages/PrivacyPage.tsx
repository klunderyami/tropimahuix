const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-paper py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-display text-brand-brown mb-8 text-center">Política de Privacidad</h1>
        
        <div className="glass-card border border-stone-200 bg-white/85 p-8 shadow-xl space-y-6 text-stone-700">
          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">1. Información que recopilamos</h2>
            <p className="leading-relaxed">
              Recopilamos información que nos proporcionas directamente, como tu nombre, correo electrónico, dirección de envío y datos de pago cuando realizas una compra. También recopilamos información sobre tu uso del sitio web mediante cookies y tecnologías similares.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">2. Uso de la información</h2>
            <p className="leading-relaxed">
              Utilizamos tu información para procesar pedidos, mejorar nuestros servicios, personalizar tu experiencia de compra y comunicarnos contigo sobre tus pedidos y promociones. No vendemos ni compartimos tu información personal con terceros sin tu consentimiento.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">3. Protección de datos</h2>
            <p className="leading-relaxed">
              Implementamos medidas de seguridad técnicas y organizativas para proteger tu información personal contra acceso no autorizado, alteración, divulgación o destrucción. Utilizamos encriptación SSL para todas las transmisiones de datos sensibles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">4. Cookies</h2>
            <p className="leading-relaxed">
              Utilizamos cookies para mejorar tu experiencia de navegación, analizar el tráfico del sitio y personalizar contenido. Puedes configurar tu navegador para rechazar cookies, aunque esto puede afectar la funcionalidad del sitio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">5. Tus derechos</h2>
            <p className="leading-relaxed">
              Tienes derecho a acceder, corregir o eliminar tu información personal en cualquier momento. También puedes oponerte al procesamiento de tus datos o solicitar la portabilidad de los mismos. Para ejercer estos derechos, contáctanos en contacto@tropicana.com.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">6. Retención de datos</h2>
            <p className="leading-relaxed">
              Conservamos tu información personal solo durante el tiempo necesario para cumplir con los fines para los que fue recopilada, incluyendo obligaciones legales, contables o de informes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">7. Servicios de terceros</h2>
            <p className="leading-relaxed">
              Utilizamos servicios de terceros como PayPal para procesar pagos y Firebase para autenticación. Estos servicios tienen sus propias políticas de privacidad que te recomendamos leer.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">8. Menores de edad</h2>
            <p className="leading-relaxed">
              Nuestro sitio web no está dirigido a menores de 18 años. No recopilamos intencionalmente información personal de menores. Si eres padre o tutor y crees que tu hijo nos ha proporcionado información personal, contáctanos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">9. Cambios en la política</h2>
            <p className="leading-relaxed">
              Podemos actualizar esta política de privacidad ocasionalmente. Te notificaremos sobre cambios significativos publicando la nueva política en esta página con una fecha de actualización.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display text-brand-brown mb-3">10. Contacto</h2>
            <p className="leading-relaxed">
              Si tienes preguntas sobre esta política de privacidad, puedes contactarnos en:
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

export default PrivacyPage;