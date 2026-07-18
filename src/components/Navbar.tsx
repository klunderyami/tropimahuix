import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, sendLoginLink, logout } from '../firebase.js';
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
  const [isLoginStarted, setIsLoginStarted] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUserState(u);
      if (u) {
        setIsLoginStarted(false);
        setEmailSent(false);
      }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      setError('Error al cerrar sesión. Inténtalo de nuevo.');
    }
  };
  
  const handleLoginClick = () => {
    setIsLoginStarted(true);
  }

  const handleSendLink: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Por favor, introduce tu correo electrónico.');
      return;
    }
    try {
      await sendLoginLink(email);
      window.localStorage.setItem('emailForSignIn', email);
      setEmailSent(true);
    } catch (err) {
      setError('Error al enviar el enlace. Inténtalo de nuevo.');
      console.error(err);
    }
  };

  if (userState) {
    return (
      <button onClick={handleLogout} className="px-3 py-2 rounded-full border border-stone-200 bg-white text-sm hover:bg-stone-50">
        Salir
      </button>
    );
  }

  if (emailSent) {
    return (
      <div className="text-sm text-center">
        <p className="font-medium text-green-700">¡Enlace enviado!</p>
        <p className="text-stone-600">Revisa tu correo para iniciar sesión.</p>
      </div>
    );
  }

  if (isLoginStarted) {
    return (
      <form onSubmit={handleSendLink} className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="px-3 py-2 text-sm border border-stone-300 rounded-full focus:ring-2 focus:ring-brand-orange focus:border-transparent transition"
          aria-label="Email"
          required
        />
        <button type="submit" className="px-3 py-2 rounded-full bg-brand-orange text-white text-sm font-semibold hover:bg-orange-600 transition-colors">
          Enviar
        </button>
        {error && <p className="text-xs text-red-500 absolute -bottom-5">{error}</p>}
      </form>
    );
  }

  return (
    <button onClick={handleLoginClick} className="px-3 py-2 rounded-full border border-stone-200 bg-white text-sm hover:bg-stone-50">
      Entrar
    </button>
  );
};
