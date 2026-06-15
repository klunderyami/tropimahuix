import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, login, logout } from '../firebase.js';
import { useAdminAccess } from '../hooks/useAdminAccess.js';

const SOCIAL_LINKS = {
  facebook: 'https://www.facebook.com/profile.php?id=100092299282591&mibextid=D4KYlr',
  instagram: 'https://www.instagram.com/tropicanamahuix?igsh=YWk5dDJ6Y2s0Y3ds',
} as const;

interface NavbarProps {
  cartItemCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ cartItemCount, isCartOpen, setIsCartOpen }) => {
  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-sm">
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
          <AdminLink />
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook Tropicaña" className="text-stone-600 hover:text-brand-orange">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 10-11.5 9.9v-7h-2.2v-2.9h2.2V9.3c0-2.2 1.3-3.4 3.3-3.4.96 0 1.97.17 1.97.17v2.2h-1.13c-1.12 0-1.47.7-1.47 1.42v1.7h2.5l-.4 2.9h-2.1v7A10 10 0 0022 12z"/></svg>
          </a>
          <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram Tropicaña" className="text-stone-600 hover:text-brand-orange">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm5 6.2A4.8 4.8 0 1016.8 13 4.8 4.8 0 0012 8.2zm6.4-2.6a1.2 1.2 0 11-1.2-1.2 1.2 1.2 0 011.2 1.2zM12 10.8A1.2 1.2 0 1110.8 12 1.2 1.2 0 0112 10.8z"/></svg>
          </a>
        </div>

        <div className="flex items-center gap-3">
          <AuthButton />

          <button
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="glass-card relative flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 hover:bg-brand-orange/15 transition-colors"
            aria-label="Abrir carrito"
            aria-expanded={isCartOpen}
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
  const { isAdmin } = useAdminAccess();

  if (!isAdmin) return null;
  return (
    <Link to="/admin" className="text-sm font-medium text-stone-600 hover:text-brand-orange transition-colors">Admin</Link>
  );
};

const AuthButton: React.FC = () => {
  const [userState, setUserState] = useState<User | null>(null);

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
    } catch {
      // ignore
    }
  };

  return (
    <button onClick={handleAuth} className="px-3 py-2 rounded-full border border-stone-200 bg-white text-sm hover:bg-stone-50">
      {userState ? 'Salir' : 'Entrar'}
    </button>
  );
};
