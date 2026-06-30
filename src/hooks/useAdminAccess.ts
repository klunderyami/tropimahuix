import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase.js';

interface AdminAccessState {
  isAdmin: boolean;
  loading: boolean;
}

export function useAdminAccess(): AdminAccessState {
  const [state, setState] = useState<AdminAccessState>({
    isAdmin: false,
    loading: true,
  });

  useEffect(() => {
    const adminUid = import.meta.env.VITE_FIREBASE_ADMIN_UID;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      setState({
        isAdmin: Boolean(adminUid && user?.uid === adminUid),
        loading: false,
      });
    });

    // Timeout de seguridad: si después de 8 segundos Firebase Auth no responde,
    // mostrar la pantalla de acceso restringido
    timeoutId = setTimeout(() => {
      setState({
        isAdmin: false,
        loading: false,
      });
    }, 8000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  return state;
}
