import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase.js';

const ADMIN_UID = import.meta.env.VITE_FIREBASE_ADMIN_UID || import.meta.env.VITE_ADMIN_UID;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    isAdmin: user?.uid === ADMIN_UID,
    loading,
  };
}