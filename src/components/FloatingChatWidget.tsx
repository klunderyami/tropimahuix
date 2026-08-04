import { useState, useEffect, useRef, FormEvent } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { createChatMessage } from '../supabase.js';
import type { NewChatMessage } from '../types.js';

const WHATSAPP_NUMBER = '5292291234567'; // Reemplazar con el número real

const FAQ_ITEMS = [
  {
    question: '¿Hacen envíos a todo México?',
    answer: 'Sí, realizamos envíos a todo el territorio mexicano. El tiempo de entrega varía de 2 a 5 días hábiles dependiendo de tu ubicación.',
  },
  {
    question: '¿Cuáles son los sabores disponibles?',
    answer: 'Contamos con una amplia variedad de sabores en nuestros licores artesanales y toritos. Algunos de los más populares son: café, chocolate, nuez, almendra, y frutas tropicales. ¡Visita nuestro catálogo para ver todos los sabores!',
  },
  {
    question: '¿Cómo comprar al mayoreo?',
    answer: 'Para compras al mayoreo, contáctanos directamente por WhatsApp o llena el formulario de distribuidores en nuestra página. Ofrecemos precios especiales y descuentos por volumen.',
  },
  {
    question: '¿Cuál es el tiempo de entrega?',
    answer: 'El tiempo de entrega es de 2 a 5 días hábiles para envíos nacionales. Para pedidos locales en Veracruz, podemos entregar el mismo día en pedidos realizados antes de las 2:00 PM.',
  },
];

const FloatingChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Simular contador de mensajes no leídos (en producción vendría de la BD)
  useEffect(() => {
    // Esto es un ejemplo - en producción deberías consultar el backend
    const hasUnread = localStorage.getItem('chat_unread');
    if (hasUnread) {
      setUnreadCount(parseInt(hasUnread, 10));
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedFaq]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !message.trim()) {
      toast.error('Por favor, completa tu nombre y mensaje.', {
        duration: 3000,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const chatMessage: NewChatMessage = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        message: message.trim(),
      };

      await createChatMessage(chatMessage);
      
      toast.success('Mensaje enviado. Te responderemos pronto.', {
        duration: 4000,
        icon: '✅',
      });

      // Limpiar formulario
      setMessage('');
      setEmail('');
      setPhone('');
      setSelectedFaq(null);

      // Marcar como leído
      setUnreadCount(0);
      localStorage.removeItem('chat_unread');
    } catch (error) {
      console.error('Error sending chat message:', error);
      toast.error('Error al enviar el mensaje. Por favor, intenta de nuevo.', {
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppClick = (predefinedMessage?: string) => {
    const messageToSend = predefinedMessage || 'Hola Tropicaña, quiero información sobre...';
    const encodedMessage = encodeURIComponent(messageToSend);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank');
  };

  const handleFaqClick = (index: number) => {
    setSelectedFaq(selectedFaq === index ? null : index);
  };

  const useFaqAnswer = (answer: string) => {
    setMessage(answer);
    setSelectedFaq(null);
  };

  return (
    <>
      <Toaster position="bottom-right" toastOptions={{ duration: 4000, className: 'font-semibold' }} />

      {/* Botón Flotante */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setUnreadCount(0);
            localStorage.removeItem('chat_unread');
          }}
          className="fixed bottom-6 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange text-white shadow-2xl transition-all hover:scale-110 hover:bg-brand-orange/90"
          aria-label="Abrir chat"
        >
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          
          {/* Badge de mensajes no leídos */}
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Ventana de Chat */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[400px] max-w-[calc(100vw-3rem)] flex-col rounded-3xl border border-stone-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-3xl bg-gradient-to-r from-brand-orange to-brand-brown px-6 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-xl">
                🌴
              </div>
              <div>
                <h3 className="font-display font-bold">Tropicaña</h3>
                <p className="text-xs text-white/80">Atención a clientes</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              aria-label="Cerrar chat"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Contenido del Chat */}
          <div className="flex-1 overflow-y-auto bg-stone-50 p-4">
            {/* Mensaje de bienvenida */}
            <div className="mb-4 rounded-2xl rounded-tl-none bg-white p-4 shadow-sm">
              <p className="text-sm text-stone-700">
                ¡Hola! 👋 Bienvenido a <span className="font-bold text-brand-orange">Tropicaña</span>.
                <br /><br />
                ¿En qué podemos ayudarte? Selecciona una pregunta frecuente o envíanos tu consulta directamente.
              </p>
            </div>

            {/* FAQ Items */}
            <div className="mb-4 space-y-2">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                Preguntas Frecuentes
              </p>
              {FAQ_ITEMS.map((faq, index) => (
                <div key={index} className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
                  <button
                    onClick={() => handleFaqClick(index)}
                    className="w-full px-4 py-3 text-left text-sm font-semibold text-stone-700 transition hover:bg-stone-50 flex items-center justify-between"
                  >
                    <span>{faq.question}</span>
                    <svg
                      className={`h-5 w-5 transition-transform ${selectedFaq === index ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {selectedFaq === index && (
                    <div className="border-t border-stone-200 bg-stone-50 p-4">
                      <p className="mb-3 text-sm text-stone-600">{faq.answer}</p>
                      <button
                        onClick={() => useFaqAnswer(faq.answer)}
                        className="text-xs font-bold text-brand-orange hover:text-brand-orange/80"
                      >
                        Usar esta respuesta →
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Formulario de envío */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre *"
                  required
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Correo (opcional)"
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Teléfono (opcional)"
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                />
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                rows={4}
                required
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 resize-none"
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-full bg-brand-orange px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-orange/90 disabled:bg-stone-300 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar mensaje'}
                </button>
                <button
                  type="button"
                  onClick={() => handleWhatsAppClick()}
                  className="rounded-full bg-green-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-700"
                  title="Contactar por WhatsApp"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="rounded-b-3xl border-t border-stone-200 bg-white px-4 py-3">
            <p className="text-center text-xs text-stone-500">
              Responderemos en menos de 24 horas
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingChatWidget;