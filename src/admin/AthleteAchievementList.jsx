import React from 'react';

const medals = { gold: 'oro', silver: 'plata', bronze: 'bronce' };
const date = (value) => new Date(`${value}T00:00:00Z`).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const summary = (item) => item.type === 'national_team'
  ? `Selección nacional · ${date(item.validFrom)} → ${item.validTo ? date(item.validTo) : 'vigente'}`
  : `${item.competitionName} · ${item.type === 'national_podium' ? (item.place === 1 ? 'Campeón nacional' : `Puesto ${item.place}`) : `Medalla de ${medals[item.medal]}`} · ${date(item.achievedOn)}`;

const AthleteAchievementList = ({ items, approvedSourceIds, busyId, onEdit, onPublish, onUnpublish, onDelete }) => {
  if (items.length === 0) return <p className="mt-5 rounded-md border border-dashed border-asanda-line p-5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">Todavía no hay logros cargados.</p>;
  return <ul className="mt-5 space-y-3">{items.map((item) => {
    const draft = item.publicationStatus === 'draft';
    return <li key={item.id} className="rounded-md border border-asanda-line p-4 dark:border-slate-700"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{item.title}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{summary(item)}</p></div><span className="rounded-full bg-asanda-mist px-3 py-1 text-xs font-bold text-asanda-deep">{draft ? 'Borrador' : 'Publicado'}</span></div><div className="mt-3 flex flex-wrap gap-3">
      {draft && <button type="button" disabled={Boolean(busyId)} onClick={() => onEdit(item)} className="min-h-10 font-bold text-asanda-deep disabled:opacity-60 dark:text-white" aria-label={`Editar ${item.title}`}>Editar</button>}
      {draft && approvedSourceIds.has(item.sourceDocumentId) && <button type="button" disabled={Boolean(busyId)} onClick={() => onPublish(item)} className="min-h-10 font-bold text-emerald-700 disabled:opacity-60" aria-label={`Publicar ${item.title}`}>Publicar</button>}
      {!draft && <button type="button" disabled={Boolean(busyId)} onClick={() => onUnpublish(item)} className="min-h-10 font-bold text-asanda-orange disabled:opacity-60" aria-label={`Despublicar ${item.title}`}>Despublicar</button>}
      {draft && <button type="button" disabled={Boolean(busyId)} onClick={() => onDelete(item)} className="min-h-10 font-bold text-red-700 disabled:opacity-60" aria-label={`Eliminar ${item.title}`}>Eliminar</button>}
    </div></li>;
  })}</ul>;
};

export default AthleteAchievementList;
