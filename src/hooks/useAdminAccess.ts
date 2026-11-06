import { useAuth } from './useAuth.js';
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';
export function useAdminAccess() {
  const { user, isAdmin, loading } = useAuth();
  return { isAdmin, loading, debugInfo: {
    expectedEmail: ADMIN_EMAIL,
    currentEmail: user?.email,
    currentUid: user?.uid,
    emailVerified: Boolean(user?.emailVerified),
  } };
}
