import { useAuth } from './useAuth.js';
export function useAdminAuth() {
  const { user, isAdmin, loading } = useAuth();
  return { isAdmin, loading, userEmail: user?.email ?? null, userId: user?.uid ?? null };
}
