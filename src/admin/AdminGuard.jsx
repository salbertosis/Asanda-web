import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminSession } from './AdminSessionContext';

const AdminGuard = ({ children }) => {
  const { status } = useAdminSession();

  if (status === 'loading') {
    return <main className="grid min-h-screen place-items-center bg-asanda-foam" role="status">Verificando acceso…</main>;
  }
  if (status !== 'authorized') return <Navigate to="/admin/login" replace />;
  return children;
};

export default AdminGuard;
