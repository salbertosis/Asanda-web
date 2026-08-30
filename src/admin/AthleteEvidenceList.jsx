import React from 'react';
import { Check, ExternalLink, X } from 'lucide-react';

const statuses = {
  pending: { label: 'Pendiente', classes: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' },
  approved: { label: 'Aprobada', classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
  rejected: { label: 'Rechazada', classes: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200' },
};

const AthleteEvidenceList = ({ items, isAdministrator, busyId, onOpenPrivate, onReview }) => {
  if (items.length === 0) return <p className="mt-5 rounded-md border border-dashed border-asanda-line p-5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">Todavía no hay pruebas cargadas.</p>;
  return (
    <ul className="mt-5 space-y-3">
      {items.map((item) => {
        const status = statuses[item.approvalStatus] || statuses.pending;
        return (
          <li key={item.id} className="rounded-md border border-asanda-line p-4 dark:border-slate-700">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{item.label}</h3><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{item.kind === 'private_object' ? 'Archivo privado' : 'Enlace oficial'} · {new Date(item.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${status.classes}`}>{status.label}</span></div>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.kind === 'official_url' ? <a href={item.officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 px-2 font-bold text-asanda-deep dark:text-slate-100"><ExternalLink size={16} aria-hidden="true" />Abrir prueba</a> : <button type="button" onClick={() => onOpenPrivate(item)} className="inline-flex min-h-10 items-center gap-2 px-2 font-bold text-asanda-deep dark:text-slate-100"><ExternalLink size={16} aria-hidden="true" />Abrir prueba</button>}
              {isAdministrator && <><button type="button" disabled={Boolean(busyId)} onClick={() => onReview(item.id, 'approved')} className="inline-flex min-h-10 items-center gap-1 px-2 font-bold text-emerald-700 disabled:opacity-60"><Check size={16} aria-hidden="true" />Aprobar</button><button type="button" disabled={Boolean(busyId)} onClick={() => onReview(item.id, 'rejected')} className="inline-flex min-h-10 items-center gap-1 px-2 font-bold text-red-700 disabled:opacity-60"><X size={16} aria-hidden="true" />Rechazar</button></>}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default AthleteEvidenceList;
