import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase.js';

interface AdminAccessState {
  isAdmin: boolean;
  loading: boolean;
  debugInfo: {
    adminUid: string | undefined;
    currentUid: string | undefined;
    hasEnvVar: boolean;
  };
}

export function useAdminAccess(): AdminAccessState {
  const [state, setState] = useState<AdminAccessState>({
    isAdmin: false,
    loading: true,
    debugInfo: {
      adminUid: undefined,
      currentUid: undefined,
      hasEnvVar: false,
    },
  });

  useEffect(() => {
    const adminUid = import.meta.env.VITE_FIREBASE_ADMIN_UID;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (!adminUid) {
      console.warn(
        '⚠️ VITE_FIREBASE_ADMIN_UID no está configurada. Nadie podrá acceder al panel admin.',
      );
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      const isAdminUser = Boolean(adminUid && user?.uid === adminUid);

      if (isAdminUser) {
        console.log('✅ Usuario administrador autenticado:', user?.uid);
      } else if (adminUid && user?.uid && user?.uid !== adminUid) {
        console.warn('❌ Acceso denegado: UID no coincide con VITE_FIREBASE_ADMIN_UID', {
          expected: adminUid,
          current: user?.uid,
        });
      }

      setState({
        isAdmin: isAdminUser,
        loading: false,
        debugInfo: {
          adminUid,
          currentUid: user?.uid,
          hasEnvVar: Boolean(adminUid),
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
