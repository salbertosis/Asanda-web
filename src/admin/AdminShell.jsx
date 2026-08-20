import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Building2, CalendarDays, Image, LogOut, Newspaper, Star, Users } from 'lucide-react';
import { useAdminSession } from './AdminSessionContext';

const roleLabel = { administrator: 'Administrador', editor: 'Editor' };

const navItem = ({ isActive }) =>
  `inline-flex min-h-12 items-center gap-2 border-b-2 px-3 font-bold transition-colors ${
    isActive ? 'border-asanda-orange text-asanda-orange' : 'border-transparent text-asanda-deep hover:text-asanda-orange dark:text-slate-200 dark:hover:text-asanda-orange'
  }`;

const AdminShell = () => {
  const { profile, signOut } = useAdminSession();

  return (
    <div className="min-h-screen bg-asanda-foam text-asanda-ink dark:bg-dark-bg dark:text-dark-text">
      <header className="border-b-4 border-asanda-orange bg-white dark:border-slate-700 dark:bg-dark-surface">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center gap-4 px-4 sm:px-5">
          <img src="/asanda.png" alt="ASANDA" className="h-auto w-40" />
          <div className="ml-auto text-right">
            <p className="font-bold">{profile.display_name}</p>
            <p className="text-xs uppercase tracking-wide text-asanda-deep dark:text-slate-300">{roleLabel[profile.role]}</p>
          </div>
          <button type="button" onClick={signOut} className="inline-flex min-h-11 items-center gap-2 px-3 font-bold text-asanda-deep hover:bg-asanda-mist dark:text-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar sesión">
            <LogOut size={19} aria-hidden="true" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>
      <nav aria-label="Módulos de administración" className="border-b border-asanda-line bg-white dark:border-slate-700 dark:bg-dark-surface">
        <div className="mx-auto flex max-w-7xl items-stretch gap-1 overflow-x-auto px-4 sm:px-5">
          <NavLink to="/admin/noticias" className={navItem}>
            <Newspaper size={17} aria-hidden="true" />
            Noticias
          </NavLink>
          <NavLink to="/admin/media" className={navItem}>
            <Image size={17} aria-hidden="true" />
            Imágenes
          </NavLink>
          <NavLink to="/admin/destacados" className={navItem}>
            <Star size={17} aria-hidden="true" />
            Destacados
          </NavLink>
          <NavLink to="/admin/atletas/nuevo" className={navItem}>
            <Users size={17} aria-hidden="true" />
            Atletas
          </NavLink>
          <NavLink to="/admin/clubes" className={navItem}>
            <Building2 size={17} aria-hidden="true" />
            Clubes
          </NavLink>
          <NavLink to="/admin/calendario" className={navItem}>
            <CalendarDays size={17} aria-hidden="true" />
            Calendario
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
