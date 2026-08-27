import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { listAdminAthletes } from '../services/admin/athletes';

const statusMeta = {
  draft: { label: 'Borrador', className: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100' },
  published: { label: 'Publicado', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
  archived: { label: 'Archivado', className: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
};

const AdminAthletesPage = () => {
  const [athletes, setAthletes] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setAthletes(null);
    setError(false);
    try {
      setAthletes(await listAdminAthletes());
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section aria-labelledby="admin-athletes-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-asanda-deep dark:text-slate-300">Perfiles públicos</p>
          <h1 id="admin-athletes-title" className="mt-2 font-display text-3xl font-bold sm:text-4xl">Atletas</h1>
        </div>
        <Link to="/admin/atletas/nuevo" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-asanda-orange-strong px-4 font-bold text-white hover:bg-[#a94320] focus-visible:outline focus-visible:outline-2 focus-visible:outline-asanda-orange">
          <Plus size={18} aria-hidden="true" />
          Nuevo atleta
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          No fue posible cargar los atletas. Intentá nuevamente.
          <button type="button" onClick={load} className="ml-3 inline-flex min-h-9 items-center gap-1 underline underline-offset-2">
            <RefreshCw size={14} aria-hidden="true" /> Reintentar
          </button>
        </p>
      )}

      {!athletes && !error && <p role="status" className="mt-6 rounded-md border border-asanda-line bg-white p-6 text-sm font-semibold text-asanda-deep dark:border-slate-700 dark:bg-dark-surface dark:text-slate-200">Cargando atletas…</p>}

      {athletes?.length === 0 && (
        <div className="mt-6 rounded-[14px] border border-dashed border-asanda-line bg-white p-10 text-center dark:border-slate-700 dark:bg-dark-surface">
          <p className="font-bold">Todavía no hay atletas.</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Creá el primer perfil público para administrarlo.</p>
        </div>
      )}

      {athletes?.length > 0 && (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {athletes.map((athlete) => {
            const status = statusMeta[athlete.publication_status] ?? statusMeta.draft;
            return (
              <li key={athlete.id} className="rounded-[14px] border border-asanda-line bg-white p-5 dark:border-slate-700 dark:bg-dark-surface">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold">{athlete.display_name}</h2>
                    {athlete.preferred_name && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Nombre preferido: {athlete.preferred_name}</p>}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
                </div>
                <Link to={`/admin/atletas/${athlete.id}`} aria-label={`Editar ${athlete.display_name}`} className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold text-asanda-deep hover:text-asanda-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-asanda-orange dark:text-slate-100 dark:hover:text-asanda-orange">
                  <Pencil size={16} aria-hidden="true" /> Editar
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default AdminAthletesPage;
