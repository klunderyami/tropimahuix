import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAccess } from '../hooks/useAdminAccess.js';

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { isAdmin, loading } = useAdminAccess();

  if (loading) return <div className="p-8 text-center">Verificando permisos...</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default AdminRoute;
