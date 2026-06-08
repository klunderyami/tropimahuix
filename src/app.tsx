import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Catalog } from './components/Catalog';

function App() {
  const [serverStatus, setServerStatus] = useState<string>('Verificando conexión...');

  useEffect(() => {
    // Es vital que tu backend tenga habilitado CORS o que el proxy de Vite esté activo
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error('Servidor no responde');
        return res.json();
      })
      .then((data) => setServerStatus(data.message))
      .catch(() => setServerStatus('⚠️ Backend no disponible'));
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 scroll-smooth">
      <Navbar />
      
      <main>
        <Hero />
        <Catalog />
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mt-12 border-t border-stone-200 text-center">
        <div className="inline-flex items-center gap-3 bg-white px-5 py-2.5 rounded-full shadow-sm border border-stone-200">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <p className="text-sm font-medium text-stone-600">
            <span className="font-bold text-stone-400 uppercase tracking-wider text-xs mr-2">Backend Core:</span>
            {serverStatus}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;