import React from 'react';
import { motion } from 'framer-motion';
import { CartItem } from '../types';

interface CartSidebarProps {
  cart: CartItem[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  updateQuantity: (productId: string, newQuantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
  cart,
  isOpen,
  setIsOpen,
  updateQuantity,
  removeFromCart,
  clearCart,
}) => {
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

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

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={() => setIsOpen(false)}
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
              <p className="text-sm text-stone-500">{cart.length} artículos seleccionados</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-stone-500 hover:text-stone-700 text-2xl leading-none"
              aria-label="Cerrar carrito"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="rounded-4xl border border-stone-200 bg-stone-50 p-8 text-center">
                <p className="text-stone-600">Aún no has agregado productos al carrito.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex gap-4">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="h-20 w-20 rounded-2xl object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-stone-900">{item.product.name}</h3>
                      <p className="text-sm text-stone-500 mb-3">{item.product.volume}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
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

          <div className="border-t border-stone-200 p-6 space-y-4">
            <div className="flex items-center justify-between text-lg font-semibold text-stone-900">
              <span>Total</span>
              <span className="text-brand-orange">${cartTotal.toFixed(2)}</span>
            </div>
            <button className="w-full rounded-3xl bg-brand-orange px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-orange/90">
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
    </>
  );
};
