import { useEffect, useState } from 'react';
import { onAuthStateChanged } from '../firebase.js';
import type { User } from '../firebase.js';
import { auth } from '../firebase.js';



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
    isAdmin: Boolean(user?.emailVerified), // Server independently checks store_admins.
    loading,
  };
}