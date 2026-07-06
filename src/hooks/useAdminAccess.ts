import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase.js';

export const ADMIN_EMAIL = 'yamilethklunder@gmail.com';

interface AdminAccessState {
  isAdmin: boolean;
  loading: boolean;
  debugInfo: {
    expectedEmail: string;
    currentEmail: string | null | undefined;
    currentUid: string | undefined;
    emailVerified: boolean;
  };
}

export function useAdminAccess(): AdminAccessState {
  const [state, setState] = useState<AdminAccessState>({
    isAdmin: false,
    loading: true,
    debugInfo: {
      expectedEmail: ADMIN_EMAIL,
      currentEmail: undefined,
      currentUid: undefined,
      emailVerified: false,
    },
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      const email = user?.email ?? null;
      const emailVerified = user?.emailVerified ?? false;
      const isAdminUser = Boolean(
        user &&
          email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
          emailVerified
      );

      if (isAdminUser) {
        console.log('✅ Administrador autenticado:', email);
      } else if (user && email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && !emailVerified) {
        console.warn('⚠️ Correo admin correcto pero NO verificado. Verifica el correo antes de acceder.');
      } else if (user) {
        console.warn('❌ Acceso denegado: correo no autorizado:', email);
      }

      setState({
        isAdmin: isAdminUser,
        loading: false,
        debugInfo: {
          expectedEmail: ADMIN_EMAIL,
          currentEmail: email,
          currentUid: user?.uid,
          emailVerified,
        },
      });
    });

    // Timeout de seguridad: si después de 8 segundos Firebase Auth no responde,
    // mostrar la pantalla de acceso restringido
    timeoutId = setTimeout(() => {
      console.warn('⚠️ Timeout de autenticación Firebase (8s)');
      setState((prev) => ({
        ...prev,
        loading: false,
      }));
    }, 8000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  return state;
}