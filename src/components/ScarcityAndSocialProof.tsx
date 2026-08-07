import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Product } from '../types';

interface ScarcityIndicatorProps {
  product: Product;
}

export const ScarcityIndicator = ({ product }: ScarcityIndicatorProps) => {
  const stockPercentage = product.stock / 10; // Asumimos que 10 es el stock inicial del lote
  const isLowStock = product.stock > 0 && product.stock <= 3;
  const isOutOfStock = product.stock === 0;

  if (isOutOfStock) {
    return (
      <div className="absolute top-3 left-3 z-20">
        <div className="glass-card rounded-full bg-stone-950/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-lg">
          Agotado
        </div>
      </div>
    );
  }

  if (isLowStock) {
    return (
      <div className="absolute top-3 left-3 z-20">
        <div className="glass-card rounded-full bg-amber-500/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-lg animate-pulse">
          ⚠️ Últimas {product.stock} unidades
        </div>
      </div>
    );
  }

  return null;
};

interface SocialProofNotification {
  id: string;
  message: string;
  timestamp: number;
}

const generateRandomNotification = (): SocialProofNotification => {
  const notifications = [
    'Alguien en Veracruz acaba de comprar',
    'Nuevo pedido desde CDMX',
    'Cliente de Monterrey agregó al carrito',
    'Compra confirmada en Guadalajara',
    'Interés reciente en licores artesanales',
  ];

  return {
    id: Date.now().toString(),
    message: notifications[Math.floor(Math.random() * notifications.length)],
    timestamp: Date.now(),
  };
};

export const SocialProofFloatingIndicator = () => {
  const [notification, setNotification] = useState<SocialProofNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Mostrar notificación inicial después de 3 segundos
    const initialTimeout = setTimeout(() => {
      setNotification(generateRandomNotification());
      setIsVisible(true);
    }, 3000);

    // Ciclo de notificaciones cada 8-15 segundos
    const interval = setInterval(() => {
      setNotification(generateRandomNotification());
      setIsVisible(true);

      // Ocultar después de 4 segundos
      setTimeout(() => {
        setIsVisible(false);
      }, 4000);
    }, 8000 + Math.random() * 7000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && notification && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: 0 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -20, x: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed bottom-24 left-4 z-40 max-w-xs sm:left-6"
        >
          <div className="glass-card rounded-2xl border border-brand-gold/30 bg-white/95 p-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-xl">
                🔥
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">
                  Actividad reciente
                </p>
                <p className="mt-1 text-sm font-semibold text-brand-brown">
                  {notification.message}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const BatchInfoBadge = ({ product }: ScarcityIndicatorProps) => {
  // Simular información del lote artesanal
  const batchNumber = `TROP-${product.id.slice(0, 6).toUpperCase()}`;
  const productionDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50/80 p-3">
      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="font-semibold text-stone-600">Lote:</span>
          <span className="ml-1 font-mono text-stone-700">{batchNumber}</span>
        </div>
        <div>
          <span className="font-semibold text-stone-600">Producción:</span>
          <span className="ml-1 text-stone-700">{productionDate}</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-stone-500 italic">
        Producto artesanal elaborado en pequeños lotes para garantizar frescura y calidad premium
      </p>
    </div>
  );
};