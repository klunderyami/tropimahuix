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
    const adminUid = import.meta.env.VITE_ADMIN_UID;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({
        isAdmin: Boolean(adminUid && user?.uid === adminUid),
        loading: false,
      });
    });

    return unsubscribe;
  }, []);

  return state;
}
