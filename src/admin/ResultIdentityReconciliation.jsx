import React, { useState } from 'react';
import { Users } from 'lucide-react';

const field = 'mt-2 min-h-11 w-full rounded-md border border-asanda-line bg-white px-3 text-asanda-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-asanda-orange dark:border-slate-600 dark:bg-slate-800 dark:text-white';
const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
const targetName = (item) => item?.display_name || item?.name || item?.short_name || item?.id || '—';

function IdentityRow({ mapping, sourceName, options, busy, onResolve }) {
  const [search, setSearch] = useState('');
  const query = normalize(search);
  const visibleOptions = options.filter((item) => item.id === mapping.targetId || normalize(`${targetName(item)} ${item.short_name || ''}`).includes(query));
  return <div className="grid min-w-0 gap-3 border-t border-asanda-line pt-4 dark:border-slate-700 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-wide text-asanda-deep dark:text-cyan-200">{mapping.mappingKind === 'athlete' ? 'Atleta' : 'Equipo'}</p>
      <p className="break-words font-semibold">{sourceName || 'Nombre no disponible en el archivo'}</p>
      <p className="break-all text-sm text-slate-600 dark:text-slate-300">{mapping.externalCode}</p>
    </div>
    <div className="min-w-0">
      <label className="block text-sm font-bold">Buscar registro ASANDA
        <input type="search" className={field} aria-label={`Buscar registro ASANDA para ${mapping.externalCode}`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre del atleta o club" />
      </label>
      <label className="mt-3 block text-sm font-bold">Registro ASANDA
        <select className={field} aria-label={`Resolver ${mapping.externalCode}`} value={mapping.targetId || ''} disabled={busy} onChange={(event) => { if (event.target.value) onResolve(mapping, event.target.value); }}>
          <option value="">Sin resolver</option>
          {visibleOptions.map((item) => <option key={item.id} value={item.id}>{targetName(item)}</option>)}
        </select>
      </label>
      {visibleOptions.length === 0 && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">No hay registros ASANDA que coincidan con la búsqueda.</p>}
    </div>
    <p className={`text-sm font-bold ${mapping.resolutionStatus === 'resolved' ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>{mapping.resolutionStatus === 'resolved' ? 'Resuelta' : 'Pendiente'}</p>
  </div>;
}

export default function ResultIdentityReconciliation({ preview, mappings, references, busy, onResolve }) {
  const [search, setSearch] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const athleteNames = new Map(preview.athletes.map((item) => [item.sourceAlias, item.displayName]));
  const teamNames = new Map(preview.teams.map((item) => [item.sourceAlias, item.displayName]));
  const sourceName = (mapping) => (mapping.mappingKind === 'athlete' ? athleteNames : teamNames).get(mapping.externalCode);
  const query = normalize(search);
  const pending = mappings.filter((mapping) => mapping.resolutionStatus !== 'resolved').length;
  const visibleMappings = mappings.filter((mapping) => (!pendingOnly || mapping.resolutionStatus !== 'resolved') && normalize(`${sourceName(mapping) || ''} ${mapping.externalCode}`).includes(query));

  return <section aria-labelledby="mapping-title" className="rounded-[14px] border border-asanda-line bg-white p-5 dark:border-slate-700 dark:bg-dark-surface sm:p-6">
    <div className="flex items-center gap-3"><Users className="shrink-0 text-asanda-orange" aria-hidden="true" /><h2 id="mapping-title" className="text-2xl font-bold">Reconciliación de identidades</h2></div>
    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Compará el nombre del archivo con el registro ASANDA antes de asociarlos. Una asociación se aplica a las distintas pruebas del atleta; buscar o filtrar no guarda cambios. No se asignan identidades automáticamente por nombre.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:items-end">
      <label className="text-sm font-bold">Buscar identidad del archivo<input type="search" className={field} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o código del archivo" /></label>
      <label className="flex min-h-11 items-center gap-2 text-sm font-bold"><input type="checkbox" checked={pendingOnly} onChange={(event) => setPendingOnly(event.target.checked)} className="h-5 w-5 accent-blue-700" />Solo pendientes</label>
    </div>
    <p role="status" className="mt-4 text-sm text-slate-600 dark:text-slate-300">{pending} pendientes de {mappings.length} identidades.</p>
    <div className="mt-4 space-y-4">
      {visibleMappings.map((mapping) => <IdentityRow key={`${mapping.mappingKind}-${mapping.externalCode}`} mapping={mapping} sourceName={sourceName(mapping)} options={mapping.mappingKind === 'athlete' ? references.athletes : references.organizations} busy={busy} onResolve={onResolve} />)}
      {visibleMappings.length === 0 && <p className="text-sm text-slate-600 dark:text-slate-300">No hay identidades que coincidan con los filtros.</p>}
    </div>
  </section>;
}
