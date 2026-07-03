import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAdminAccess } from '../hooks/useAdminAccess.js';
import { login, loginWithEmail, auth, onAuthStateChanged } from '../firebase.js';

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { isAdmin, loading, debugInfo } = useAdminAccess();
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  // Estado para el formulario de email/contraseña
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEmailLogin, setIsEmailLogin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUid(user?.uid || null);
    });
    return unsubscribe;
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);
    try {
      await loginWithEmail(email, password);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión.';
      // Traducir errores comunes de Firebase
      if (errorMessage.includes('auth/user-not-found') || errorMessage.includes('auth/wrong-password') || errorMessage.includes('auth/invalid-credential')) {
        setAuthError('❌ Correo o contraseña incorrectos.');
      } else if (errorMessage.includes('auth/invalid-email')) {
        setAuthError('❌ El formato del correo no es válido.');
      } else if (errorMessage.includes('auth/too-many-requests')) {
        setAuthError('❌ Demasiados intentos. Espera unos minutos e intenta de nuevo.');
      } else {
        setAuthError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen p-8 text-center">Verificando permisos...</div>;
  }

  if (!isAdmin) {
    const envMissing = !debugInfo.hasEnvVar;

    return (
      <div className="min-h-screen bg-paper px-4 py-10 font-sans text-stone-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-stone-200 bg-white p-10 shadow-xl">
          <div className="mb-6 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-brand-orange font-bold">Acceso restringido</p>
            <h1 className="mt-4 text-4xl font-display text-brand-brown">Panel de administración</h1>
            <p className="mt-3 text-sm text-stone-600">
              Debes iniciar sesión con la cuenta administrativa correcta para continuar.
            </p>

            {/* Error de variable de entorno */}
            {envMissing && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-left text-xs">
                <p className="font-bold text-red-800">🚨 Error crítico:</p>
                <p className="mt-1 text-red-700">
                  La variable de entorno <code className="bg-red-100 px-1 rounded">VITE_FIREBASE_ADMIN_UID</code> no está configurada.
                </p>
                <p className="mt-2 text-red-700">
                  <strong>Solución:</strong> Agrega la variable en tu archivo <code className="bg-red-100 px-1 rounded">.env</code>
                </p>
              </div>
            )}

            {/* Debug info cuando estás autenticado pero sin permisos */}
            {!envMissing && currentUid && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-xs">
                <p className="font-bold text-amber-800">🔍 Tu UID actual:</p>
                <code className="mt-1 block break-all rounded bg-white px-2 py-1 text-amber-700 select-all">
                  {currentUid}
                </code>
                <div className="mt-2 text-amber-700">
                  Copia este UID y asegúrate de que coincida con{' '}
                  <code className="bg-amber-100 px-1 rounded">VITE_FIREBASE_ADMIN_UID</code> (o alternativamente{' '}
                  <code className="bg-amber-100 px-1 rounded">VITE_ADMIN_UID</code>)
                </div>
                <details className="mt-2 text-amber-700 cursor-pointer">
                  <summary className="font-semibold">📋 Info de depuración (click para expandir)</summary>
                  <pre className="mt-1 bg-white rounded p-2 text-xs overflow-auto max-h-40">
                    {JSON.stringify(
                      {
                        expectedUid: debugInfo.adminUid || 'NO CONFIGURADA',
                        currentUid: debugInfo.currentUid || 'No autenticado',
                        envVarExists: debugInfo.hasEnvVar,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Botón de Google Login */}
            <button
              type="button"
              disabled={envMissing}
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
              className={`w-full rounded-3xl px-6 py-4 text-sm font-bold text-white transition ${
                envMissing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-brand-orange hover:bg-brand-orange/90'
              }`}
            >
              {envMissing ? '⚠️ Configura VITE_FIREBASE_ADMIN_UID' : 'Iniciar sesión con Google'}
            </button>

            {/* Separador */}
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-stone-200"></div>
              <span className="mx-4 text-xs font-semibold text-stone-400">O</span>
              <div className="flex-grow border-t border-stone-200"></div>
            </div>

            {/* Formulario de Email/Contraseña */}
            {!isEmailLogin ? (
              <button
                type="button"
                disabled={envMissing}
                onClick={() => setIsEmailLogin(true)}
                className={`w-full rounded-3xl border-2 px-6 py-4 text-sm font-bold transition ${
                  envMissing
                    ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                    : 'border-brand-brown text-brand-brown hover:bg-brand-brown hover:text-white'
                }`}
              >
                Iniciar sesión con correo y contraseña
              </button>
            ) : (
              <form onSubmit={handleEmailLogin} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Correo electrónico"
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || envMissing}
                    className={`flex-1 rounded-3xl px-6 py-4 text-sm font-bold text-white transition ${
                      envMissing || isSubmitting
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-brand-brown hover:bg-brand-brown/90'
                    }`}
                  >
                    {isSubmitting ? 'Iniciando sesión...' : 'Entrar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEmailLogin(false);
                      setAuthError(null);
                    }}
                    className="rounded-3xl border border-stone-300 px-4 py-4 text-sm font-bold text-stone-600 hover:bg-stone-100"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* Errores de autenticación */}
            {authError && (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
                {authError}
              </div>
            )}

            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5 text-sm text-stone-600">
              <p className="font-semibold mb-2">💡 ¿Cómo configurar el acceso de admin?</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Inicia sesión con Google o correo/contraseña</li>
                <li>Abre la consola del navegador (F12)</li>
                <li>Busca el mensaje con tu UID o ejecuta: <code className="bg-white px-1 rounded">firebase.auth().currentUser.uid</code></li>
                <li>Copia el UID y agrégalo a tu <code className="bg-white px-1 rounded">.env</code> como <code className="bg-white px-1 rounded">VITE_FIREBASE_ADMIN_UID</code></li>
                <li>Reinicia el servidor (<code className="bg-white px-1 rounded">npm run dev</code>)</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;
