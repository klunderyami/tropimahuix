import { useEffect, useState } from 'react';
import { auth, onAuthStateChanged } from '../firebase.js';
import type { User } from '../firebase.js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let generation = 0;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const current = ++generation;
      setUser(currentUser);
      setIsAdmin(false);
      if (!currentUser?.emailVerified) { setLoading(false); return; }
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/admin/me', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        if (current === generation) setIsAdmin(response.ok);
      } catch { if (current === generation) setIsAdmin(false); }
      finally { if (current === generation) setLoading(false); }
    });
    return () => { generation++; unsubscribe(); };
  }, []);
  return { user, isAdmin, loading };
}
