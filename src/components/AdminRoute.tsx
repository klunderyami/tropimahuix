import { useState } from 'react';
import type { ReactNode } from 'react';
import { useAdminAccess } from '../hooks/useAdminAccess.js';
import { login } from '../firebase.js';

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { isAdmin, loading } = useAdminAccess();
  const [authError, setAuthError] = useState<string | null>(null);

  if (loading) {
    return <div className="min-h-screen p-8 text-center">Verificando permisos...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-paper px-4 py-10 font-sans text-stone-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-stone-200 bg-white p-10 shadow-xl">
          <div className="mb-6 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-brand-orange font-bold">Acceso restringido</p>
            <h1 className="mt-4 text-4xl font-display text-brand-brown">Panel de administración</h1>
            <p className="mt-3 text-sm text-stone-600">
              Debes iniciar sesión con la cuenta administrativa correcta para continuar.
            </p>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={async () => {
                setAuthError(null);
                try {
                  await login();
                } catch (error) {
                  setAuthError(
                    error instanceof Error
                      ? error.message
                      : 'No se pudo iniciar sesión. Intenta de nuevo.',
                  );
                }
              }}
              className="w-full rounded-3xl bg-brand-orange px-6 py-4 text-sm font-bold text-white transition hover:bg-brand-orange/90"
            >
              Iniciar sesión administrativa
            </button>

            {authError && (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
                {authError}
              </div>
            )}

            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5 text-sm text-stone-600">
              Si ya estás conectado pero no tienes acceso, revisa que tu UID coincida con{' '}
              <code className="rounded bg-white px-1 py-0.5 text-xs text-stone-700">VITE_ADMIN_UID</code>.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;
