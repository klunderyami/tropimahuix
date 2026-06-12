import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { AdminPanel } from './AdminPanel';
import type { NewProduct } from '../types';

interface AdminDashboardProps {
  onAddProduct: (product: NewProduct) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onAddProduct }) => {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (e) {
      // noop
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Panel de administración</h2>
        <div className="flex items-center gap-3">
          <button onClick={handleSignOut} className="px-3 py-2 bg-rose-500 text-white rounded">Cerrar sesión</button>
        </div>
      </div>

      <section>
        <p className="mb-4 text-sm text-stone-600">Aquí puedes añadir productos al catálogo.</p>
        <AdminPanel onAddProduct={onAddProduct} />
      </section>
    </div>
  );
};

export default AdminDashboard;
