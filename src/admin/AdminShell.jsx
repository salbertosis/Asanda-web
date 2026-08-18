import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LogOut, Newspaper } from 'lucide-react';
import { useAdminSession } from './AdminSessionContext';

const roleLabel = { administrator: 'Administrador', editor: 'Editor' };

const navItem = ({ isActive }) =>
  `inline-flex min-h-12 items-center gap-2 border-b-2 px-3 font-bold transition-colors ${
    isActive ? 'border-asanda-orange text-asanda-orange' : 'border-transparent text-asanda-deep hover:text-asanda-orange'
  }`;

const AdminShell = () => {
  const { profile, signOut } = useAdminSession();

  return (
    <div className="min-h-screen bg-asanda-foam text-asanda-ink">
      <header className="border-b-4 border-asanda-orange bg-white">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center gap-4 px-4 sm:px-5">
          <img src="/asanda.png" alt="ASANDA" className="h-auto w-40" />
          <div className="ml-auto text-right">
            <p className="font-bold">{profile.display_name}</p>
            <p className="text-xs uppercase tracking-wide text-asanda-deep">{roleLabel[profile.role]}</p>
          </div>
          <button type="button" onClick={signOut} className="inline-flex min-h-11 items-center gap-2 px-3 font-bold text-asanda-deep hover:bg-asanda-mist" aria-label="Cerrar sesión">
            <LogOut size={19} aria-hidden="true" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>
      <nav aria-label="Módulos de administración" className="border-b border-asanda-line bg-white">
        <div className="mx-auto flex max-w-7xl items-stretch gap-1 overflow-x-auto px-4 sm:px-5">
          <NavLink to="/admin/noticias" className={navItem}>
            <Newspaper size={17} aria-hidden="true" />
            Noticias
          </NavLink>
        </div>
      </nav>
      <main id="admin-main" className="mx-auto max-w-7xl px-4 py-10 sm:px-5">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminShell;