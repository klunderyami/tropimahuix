import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext.js';

export const CartSidebar = () => {
  const navigate = useNavigate();
  const { cartItems, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, clearCart } = useCart();
  const cartTotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  
  // Configuración de recompensas
  const FREE_SHIPPING_THRESHOLD = 500;
  const GIFT_THRESHOLD = 800;
  
  // Estado para exit intent
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutos en segundos
  const [hasShownExitIntent, setHasShownExitIntent] = useState(false);

  const sidebarVariants = {
    hidden: { opacity: 0, x: 400 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: 'spring' as const, stiffness: 280, damping: 28 },
    },
    exit: { opacity: 0, x: 400 },
  } as const;

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  } as const;

  // Calcular progreso hacia la siguiente recompensa
  const getNextReward = () => {
    if (cartTotal >= GIFT_THRESHOLD) {
      return { type: 'gift', remaining: 0, label: '¡Obsequio artesanal incluido!' };
    }
    if (cartTotal >= FREE_SHIPPING_THRESHOLD) {
      const remaining = GIFT_THRESHOLD - cartTotal;
      return { type: 'gift', remaining, label: `Agrega $${remaining.toFixed(2)} más para obsequio artesanal` };
    }
    const remaining = FREE_SHIPPING_THRESHOLD - cartTotal;
    return { type: 'shipping', remaining, label: `Agrega $${remaining.toFixed(2)} más para envío prioritario gratis` };
  };

  const nextReward = getNextReward();
  const progressPercentage = cartTotal >= GIFT_THRESHOLD 
    ? 100 
    : cartTotal >= FREE_SHIPPING_THRESHOLD 
      ? ((cartTotal - FREE_SHIPPING_THRESHOLD) / (GIFT_THRESHOLD - FREE_SHIPPING_THRESHOLD)) * 100
      : (cartTotal / FREE_SHIPPING_THRESHOLD) * 100;

  // Exit intent detection
  useEffect(() => {
    if (!isCartOpen || hasShownExitIntent || cartItems.length === 0) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 10 && !hasShownExitIntent) {
        setShowExitIntent(true);
        setHasShownExitIntent(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [isCartOpen, hasShownExitIntent, cartItems.length]);

  // Countdown timer
  useEffect(() => {
    if (!showExitIntent || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setShowExitIntent(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showExitIntent, countdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExitIntentClose = () => {
    setShowExitIntent(false);
    setIsCartOpen(false);
  };

  const handleExitIntentAccept = () => {
    setShowExitIntent(false);
    // El usuario continúa comprando, no cerramos el carrito
  };

  if (!isCartOpen) {
    return null;
  }

  return (
    <>
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={() => setIsCartOpen(false)}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
      />

      <motion.div
        variants={sidebarVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed right-0 top-0 z-50 h-screen w-full max-w-md p-6"
      >
        <div className="glass-card h-full flex flex-col overflow-hidden bg-white/90 border border-brand-gold/20 shadow-2xl">
          <div className="flex items-center justify-between border-b border-stone-200 p-6">
            <div>
              <h2 className="text-2xl font-display text-brand-brown">Tu Carrito</h2>
              <p className="text-sm text-stone-500">{cartItems.length} artículos seleccionados</p>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="text-stone-500 hover:text-stone-700 text-2xl leading-none"
              aria-label="Cerrar carrito"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cartItems.length === 0 ? (
              <div className="rounded-4xl border border-stone-200 bg-stone-50 p-8 text-center">
                <p className="text-stone-600">Aún no has agregado productos al carrito.</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.product.id} className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex gap-4">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="h-20 w-20 rounded-2xl object-contain"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-stone-900">{item.product.name}</h3>
                      <p className="text-sm text-stone-500 mb-3">{item.product.volume}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="h-8 w-8 rounded-full bg-stone-200 text-stone-700 hover:bg-brand-orange transition-colors"
                          aria-label="Disminuir cantidad"
                        >
                          −
                        </button>
                        <span className="min-w-[32px] text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="h-8 w-8 rounded-full bg-stone-200 text-stone-700 hover:bg-brand-orange transition-colors"
                          aria-label="Aumentar cantidad"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="ml-auto text-rose-500 hover:text-rose-700 text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-stone-700">
                    <span>Subtotal</span>
                    <span className="font-semibold text-brand-brown">${(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Barra de progreso de recompensa */}
          {cartItems.length > 0 && (
            <div className="border-t border-stone-200 p-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-stone-700">Progreso de recompensa</span>
                <span className="text-xs text-stone-500">{Math.min(progressPercentage, 100).toFixed(0)}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-brand-orange to-brand-lime"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs font-medium text-stone-600">
                {nextReward.label}
              </p>
            </div>
          )}

          <div className="border-t border-stone-200 p-6 space-y-4">
            <div className="flex items-center justify-between text-lg font-semibold text-stone-900">
              <span>Total</span>
              <span className="text-brand-orange">${cartTotal.toFixed(2)}</span>
            </div>
            <button
              onClick={() => {
                setIsCartOpen(false);
                navigate('/checkout');
              }}
              disabled={cartItems.length === 0}
              className="w-full rounded-3xl bg-brand-orange px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-orange/90 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              Proceder al Pago
            </button>
            <button
              onClick={clearCart}
              className="w-full rounded-3xl border border-stone-300 px-6 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Vaciar Carrito
            </button>
          </div>
        </div>
      </motion.div>

      {/* Exit Intent Modal */}
      <AnimatePresence>
        {showExitIntent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md rounded-[2rem] border-2 border-brand-orange/30 bg-white p-8 shadow-2xl"
            >
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange/10 text-4xl">
                  ⏰
                </div>
                <h3 className="text-3xl font-display font-black text-brand-brown">
                  ¡Espera! Oferta Especial
                </h3>
                <p className="mt-3 text-stone-600">
                  Tu carrito tiene productos increíbles. Aprovecha esta oferta por tiempo limitado:
                </p>
                
                <div className="mt-6 rounded-2xl border-2 border-brand-orange/20 bg-gradient-to-br from-brand-orange/5 to-brand-lime/5 p-6">
                  <p className="text-sm font-bold uppercase tracking-wider text-brand-orange">
                    Oferta Exclusiva
                  </p>
                  <p className="mt-2 text-4xl font-black text-brand-brown">
                    15% OFF
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    en tu compra completa
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-rose-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Termina en: {formatTime(countdown)}</span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    onClick={handleExitIntentAccept}
                    className="w-full rounded-full bg-brand-orange px-6 py-4 text-sm font-bold text-white transition hover:bg-brand-orange/90 hover:shadow-lg"
                  >
                    Aprovechar 15% OFF Ahora
                  </button>
                  <button
                    onClick={handleExitIntentClose}
                    className="w-full rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
                  >
                    No, gracias
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
