import React from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useAdminSession } from './AdminSessionContext';

const roleLabel = { administrator: 'Administrador', editor: 'Editor' };

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
      <main id="admin-main" className="mx-auto max-w-7xl px-4 py-10 sm:px-5">
        <div className="rounded-[14px] border border-asanda-line bg-white p-6 sm:p-8">
          <ShieldCheck className="text-asanda-deep" size={32} aria-hidden="true" />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-asanda-deep">Área protegida</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Panel de administración</h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">La sesión está activa. Los módulos de contenido se habilitarán en las siguientes entregas.</p>
        </div>
      </main>
    </div>
  );
};

export default AdminShell;
