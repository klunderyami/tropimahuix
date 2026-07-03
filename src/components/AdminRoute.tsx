import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAdminAccess } from '../hooks/useAdminAccess.js';
import { login, auth, onAuthStateChanged } from '../firebase.js';

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { isAdmin, loading, debugInfo } = useAdminAccess();
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUid(user?.uid || null);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="min-h-screen p-8 text-center">Verificando permisos...</div>;
  }

  if (!isAdmin) {
    const displayUid = currentUid || 'No has iniciado sesión';
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

            {/* Instrucciones cuando NO estás autenticado */}
            {!currentUid && !envMissing && (
              <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-left text-xs">
                <p className="text-stone-600">
                  Haz clic en "Iniciar sesión administrativa" para autenticarte con Google.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
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
              {envMissing ? '⚠️ Configura VITE_FIREBASE_ADMIN_UID' : 'Iniciar sesión administrativa'}
            </button>

            {authError && (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
                {authError}
              </div>
            )}

            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5 text-sm text-stone-600">
              <p className="font-semibold mb-2">💡 ¿Cómo configurar el acceso de admin?</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Abre la consola del navegador (F12)</li>
                <li>Ejecuta: <code className="bg-white px-1 rounded">firebase.auth().currentUser.uid</code></li>
                <li>Copia el resultado y agrégalo a tu <code className="bg-white px-1 rounded">.env</code></li>
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