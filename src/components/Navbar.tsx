import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, login, logout } from '../firebase';

interface NavbarProps {
  cartItemCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ cartItemCount, isCartOpen, setIsCartOpen }) => {
  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-stone-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-display text-brand-brown">🌴</span>
          <div>
            <h1 className="text-xl font-bold text-brand-brown">Tropicaña</h1>
            <p className="text-xs uppercase tracking-[0.35em] text-brand-orange font-semibold">Licores & Toritos</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-stone-600 hover:text-brand-orange transition-colors">Inicio</Link>
          <a href="#catalog" className="text-sm font-medium text-stone-600 hover:text-brand-orange transition-colors">Catálogo</a>
          {/* Mostrar enlace admin solo si el usuario autenticado coincide con VITE_ADMIN_UID */}
          {/**/}
          {/**/}
          <AdminLink />
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-stone-600 hover:text-brand-orange">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 10-11.5 9.9v-7h-2.2v-2.9h2.2V9.3c0-2.2 1.3-3.4 3.3-3.4.96 0 1.97.17 1.97.17v2.2h-1.13c-1.12 0-1.47.7-1.47 1.42v1.7h2.5l-.4 2.9h-2.1v7A10 10 0 0022 12z"/></svg>
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-stone-600 hover:text-brand-orange">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm5 6.2A4.8 4.8 0 1016.8 13 4.8 4.8 0 0012 8.2zm6.4-2.6a1.2 1.2 0 11-1.2-1.2 1.2 1.2 0 011.2 1.2zM12 10.8A1.2 1.2 0 1110.8 12 1.2 1.2 0 0112 10.8z"/></svg>
          </a>
        </div>

        <div className="flex items-center gap-3">
          <AuthButton />

          <button
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 hover:bg-brand-orange/20 transition-colors"
            aria-label="Abrir carrito"
          >
            <span className="text-lg">🛒</span>
            <span className="text-sm font-semibold text-brand-brown">{cartItemCount}</span>
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};

const AdminLink: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const adminUid = ((import.meta as any).env?.VITE_ADMIN_UID as string) || '';
      setIsAdmin(!!user && user.uid === adminUid);
    });
    return () => unsub();
  }, []);

  if (!isAdmin) return null;
  return (
    <Link to="/admin" className="text-sm font-medium text-stone-600 hover:text-brand-orange transition-colors">Admin</Link>
  );
};

const AuthButton: React.FC = () => {
  const [userState, setUserState] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUserState(u));
    return () => unsub();
  }, []);

  const handleAuth = async () => {
    try {
      if (userState) {
        await logout();
      } else {
        await login();
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <button onClick={handleAuth} className="px-3 py-2 rounded-full border border-stone-200 bg-white text-sm hover:bg-stone-50">
      {userState ? 'Salir' : 'Entrar'}
    </button>
  );
};
