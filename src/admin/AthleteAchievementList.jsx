import React from 'react';

const types = { national_podium: 'Podio nacional', international_podium: 'Podio internacional', international_participation: 'Participación internacional', state_record: 'Récord estatal' };
const outcomes = { top_8: 'Top 8', outstanding_participation: 'Participación destacada' };
const date = (value) => new Date(`${value}T00:00:00Z`).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const childLabel = (child, type) => {
  if (!child.eventDefinitionId && child.legacyEventLabel) return `Resultado legado pendiente de remediación: ${child.legacyEventLabel}`;
  const event = child.eventName || child.legacyEventLabel || 'Prueba no disponible';
  if (type === 'state_record') return `${event} · ${child.recordStatus === 'published' ? 'Récord oficial publicado' : 'Récord oficial no disponible'}`;
  if (type === 'international_participation') return `${event} · ${outcomes[child.participationOutcome] || 'Resultado pendiente'}`;
  return `${event} · ${child.podiumPlace ? `Puesto ${child.podiumPlace}` : 'Resultado pendiente'}`;
};
const canPublish = (item) => item.children.length > 0 && item.children.every((child) => child.eventDefinitionId && child.eventActive && (item.type !== 'state_record' || child.recordStatus === 'published'));

const AthleteAchievementList = ({ items, busyId, onEdit, onPublish, onDelete }) => {
  if (items.length === 0) return <p className="mt-5 rounded-md border border-dashed border-asanda-line p-5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">Todavía no hay competencias cargadas.</p>;
  return <ul className="mt-5 space-y-3" aria-label="Competencias y logros del atleta">{items.map((item) => {
    const draft = item.publicationStatus === 'draft';
    const publishable = canPublish(item);
    return <li key={item.id} className="min-w-0 rounded-md border border-asanda-line p-4 dark:border-slate-700"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-bold">{item.title}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{types[item.type]} · {item.competitionName} · {item.location} · {date(item.achievedOn)}</p></div><span className="shrink-0 rounded-full bg-asanda-mist px-3 py-1 text-xs font-bold text-asanda-deep">{draft ? 'Borrador' : 'Publicado'}</span></div>
      <ul className="mt-3 space-y-2 border-l-2 border-asanda-mist pl-4 text-sm"><li className="sr-only">Resultados</li>{item.children.map((child) => <li key={child.id || child.eventDefinitionId || child.legacySourceIdentifier} className="break-words">{childLabel(child, item.type)}{(!child.eventDefinitionId || !child.eventActive || (item.type === 'state_record' && child.recordStatus !== 'published')) && <span className="ml-1 font-semibold text-amber-800 dark:text-amber-200">(requiere remediación)</span>}</li>)}</ul>
      <div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={Boolean(busyId)} onClick={() => onEdit(item)} className="min-h-10 font-bold text-asanda-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-asanda-orange disabled:opacity-60 dark:text-white" aria-label={`Editar ${item.title}`}>Editar</button>{draft && <button type="button" disabled={Boolean(busyId) || !publishable} onClick={() => onPublish(item)} className="min-h-10 font-bold text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-asanda-orange disabled:opacity-50 dark:text-emerald-300" aria-label={`Publicar ${item.title}`} title={publishable ? undefined : 'Corregí los resultados antes de publicar'}>Publicar</button>}<button type="button" disabled={Boolean(busyId)} onClick={() => onDelete(item)} className="min-h-10 font-bold text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-asanda-orange disabled:opacity-60 dark:text-red-300" aria-label={`Eliminar ${item.title}`}>Eliminar</button></div>
      {!publishable && draft && <p className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-200">La competencia no se puede publicar hasta corregir sus resultados.</p>}
    </li>;
  })}</ul>;
};

export default AthleteAchievementList;
