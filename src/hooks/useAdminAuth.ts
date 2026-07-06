import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase.js';
import { ADMIN_EMAIL } from './useAdminAccess.js';

interface AdminAuthState {
  isAdmin: boolean;
  loading: boolean;
  userEmail: string | null;
  userId: string | null;
}

/**
 * useAdminAuth
 * 
 * Verifica el estado de autenticación del administrador.
 * Si el usuario está autenticado pero su correo NO es yamilethklunder@gmail.com,
 * lo desloguea automáticamente y limpia la sesión local.
 * Protege la ruta /admin/* con este Hook.
 */
export function useAdminAuth(): AdminAuthState {
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    loading: true,
    userEmail: null,
    userId: null,
  });

  const forceLogout = useCallback(async () => {
    try {
      // Limpiar cache local de Firebase
      await signOut(auth);
      // Limpiar localStorage
      localStorage.removeItem('emailForSignIn');
      localStorage.removeItem('firebase:previousUser');
      // Limpiar sessionStorage
      sessionStorage.clear();
    } catch (error) {
      console.error('Error al cerrar sesión forzado:', error);
    }
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (!user) {
        setState({
          isAdmin: false,
          loading: false,
          userEmail: null,
          userId: null,
        });
        return;
      }

      const email = (user.email ?? '').toLowerCase();
      const isAdminUser = email === ADMIN_EMAIL.toLowerCase() && user.emailVerified;

      if (user && !isAdminUser) {
        // Usuario autenticado pero NO admin → desloguear inmediatamente
        console.warn(
          `🚫 Usuario no autorizado detectado: ${email}. Cerrando sesión automáticamente.`
        );
        await forceLogout();
        setState({
          isAdmin: false,
          loading: false,
          userEmail: null,
          userId: null,
        });
        return;
      }

      if (isAdminUser) {
        setState({
          isAdmin: true,
          loading: false,
          userEmail: user.email,
          userId: user.uid,
        });
      } else {
        setState({
          isAdmin: false,
          loading: false,
          userEmail: user.email,
          userId: user.uid,
        });
      }
    });

    // Timeout de seguridad
    timeoutId = setTimeout(() => {
      console.warn('⚠️ Timeout de autenticación Firebase (8s) — useAdminAuth');
      setState((prev) => ({
        ...prev,
        loading: false,
      }));
    }, 8000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [forceLogout]);

  return state;
}