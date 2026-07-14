import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useSiteConfig } from '../contexts/SiteConfigContext.js';

const TropicanaLogo = ({ logoUrl }: { logoUrl?: string }) => {
  if (logoUrl) {
    return (
      <img src={logoUrl} alt="Tropicaña Logo" className="h-10 w-auto object-contain" />
    );
  }

  return (
    <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="10" y="30" fontFamily="serif" fontSize="24" fill="#8C4D16" fontWeight="bold">
        Tropicaña
      </text>
    </svg>
  );
};

const Navbar = () => {
  const { user, isAdmin } = useAuth();
  const { config } = useSiteConfig();

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-bold transition ${
      isActive ? 'text-brand-orange' : 'text-stone-700 hover:text-brand-orange'
    }`;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-stone-200/80 bg-paper/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center">
          <TropicanaLogo logoUrl={config?.logoUrl} />
        </Link>

        <div className="flex items-center gap-6">
          <NavLink to="/" className={navLinkClasses}>
            Inicio
          </NavLink>
          <NavLink to="/media-gallery" className={navLinkClasses}>
            Galería
          </NavLink>
        </div>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link
              to="/admin"
              className="rounded-full bg-brand-brown px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-brown/90"
            >
              Admin
            </Link>
          )}
          {user ? (
            <div className="text-sm text-stone-600">
              Hola, {user.displayName?.split(' ')[0] || 'Admin'}
            </div>
          ) : (
            <Link
              to="/admin"
              className="rounded-full border border-brand-brown px-4 py-2 text-xs font-bold text-brand-brown transition hover:bg-brand-brown/5"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;