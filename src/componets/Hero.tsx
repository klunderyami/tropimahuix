import React from 'react';

export const Hero: React.FC = () => {
  return (
    <section className="relative bg-gradient-to-b from-amber-900 to-stone-900 text-amber-50 py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Elementos decorativos de fondo que simulan un ambiente artesanal */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-5xl mx-auto text-center relative z-10">
        {/* Eslogan pequeño */}
        <span className="inline-block text-amber-400 font-semibold tracking-widest text-sm uppercase mb-4 border-b border-amber-500/30 pb-2">
          Tradición y Sabor de Nuestra Tierra
        </span>

        {/* Título Principal de Impacto */}
        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6 leading-tight">
          Licores y Toritos{' '}
          <span className="font-['Dancing_Script'] text-amber-400 block mt-2 md:inline md:mt-0 font-normal">
            100% Artesanales
          </span>
        </h1>

        {/* Descripción del negocio */}
        <p className="text-lg md:text-xl text-stone-300 max-w-3xl mx-auto mb-10 leading-relaxed">
          En <span className="text-amber-300 font-semibold">Tropicaña</span> preservamos las recetas tradicionales utilizando ingredientes naturales y un proceso de destilación meticuloso. Descubre el balance perfecto entre suavidad, carácter y frescura en cada botella.
        </p>

        {/* Botones de Acción (CTA) */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <a
            href="#licores"
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold px-8 py-4 rounded-xl shadow-xl transition-all duration-300 hover:scale-105 text-center"
          >
            Explorar Catálogo
          </a>
          <a
            href="#nosotros"
            className="w-full sm:w-auto border-2 border-amber-500/50 hover:border-amber-400 text-amber-300 hover:text-amber-200 font-semibold px-8 py-4 rounded-xl transition-all duration-300 text-center bg-stone-900/50 backdrop-blur-sm"
          >
            Conoce Nuestra Historia
          </a>
        </div>
      </div>
    </section>
  );
};