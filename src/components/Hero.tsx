import React from 'react';
import { motion } from 'framer-motion';

export const Hero: React.FC = () => {
  // Variantes de animación para la entrada elegante y secuencial del contenido
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 50, damping: 14 },
    },
  } as const;

  return (
    <section className="relative bg-gradient-to-b from-brand-brown via-stone-900 to-paper text-amber-50 py-32 px-4 sm:px-6 lg:px-8 overflow-hidden min-h-[85vh] flex items-center">
      
      {/* 1. Elementos ambientales y decorativos de fondo (Blobs Premium) */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-[500px] h-[500px] bg-brand-orange/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-[550px] h-[550px] bg-brand-gold/10 rounded-full blur-[140px] pointer-events-none"></div>
      
      {/* Patrón sutil superpuesto para acentuar lo artesanal */}
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(var(--color-brand-gold)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto text-center relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          {/* 2. Eslogan de presentación */}
          <motion.span 
            variants={itemVariants}
            className="inline-block text-brand-gold font-semibold tracking-[0.2em] text-xs sm:text-sm uppercase mb-6 border-b border-brand-gold/30 pb-3"
          >
            Tradición y Sabor de Nuestra Tierra
          </motion.span>

          {/* 3. Título Principal de Impacto utilizando font-display corporativa */}
          <motion.h1 
            variants={itemVariants}
            className="text-5xl sm:text-6xl md:text-8xl font-black text-white tracking-tight mb-8 leading-[1.1]"
          >
            Licores y Toritos{' '}
            <span className="font-display text-brand-orange block mt-3 md:inline md:mt-0 font-normal normal-case drop-shadow-md">
              100% Artesanales
            </span>
          </motion.h1>

          {/* 4. Descripción pulida del negocio */}
          <motion.p 
            variants={itemVariants}
            className="text-base sm:text-lg md:text-xl text-stone-300 max-w-3xl mx-auto mb-12 leading-relaxed font-light"
          >
            En <span className="text-brand-gold font-semibold drop-shadow-sm">Tropicaña</span> preservamos las recetas tradicionales utilizando ingredientes naturales y un proceso de destilación meticuloso. Descubre el balance perfecto entre suavidad, carácter y frescura en cada botella.
          </motion.p>

          {/* 5. Botones de Acción (Call To Action) Interactivos */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row justify-center items-center gap-5 w-full sm:w-auto"
          >
            <a
              href="#licores"
              className="w-full sm:w-auto bg-brand-orange hover:bg-brand-orange/90 text-white font-bold px-10 py-4 rounded-xl shadow-xl hover:shadow-brand-orange/20 transition-all duration-300 hover:-translate-y-1 text-center tracking-wide active:scale-[0.98] cursor-pointer"
            >
              Explorar Catálogo
            </a>
            <a
              href="#nosotros"
              className="w-full sm:w-auto border border-stone-400/40 hover:border-brand-gold text-stone-200 hover:text-brand-gold font-medium px-10 py-4 rounded-xl transition-all duration-300 hover:-translate-y-1 text-center bg-stone-900/40 backdrop-blur-md shadow-lg active:scale-[0.98] cursor-pointer"
            >
              Conoce Nuestra Historia
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};