import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, RefreshCw, Star, Trash2 } from 'lucide-react';
import { listFeaturedAthletes, listPublishableAthletes, removeFeaturedAthlete, saveFeaturedAthlete } from '../services/admin/featured';
import { featuredWindow } from '../services/admin/editorialLogic';

const toLocalInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date(value).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
};

const AdminFeaturedPage = () => {
  const [items, setItems] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ athleteId: '', displayOrder: '', startsAt: '', endsAt: '' });

  const load = useCallback(async () => {
    setError(null);
    try {
      const [featured, candidates] = await Promise.all([listFeaturedAthletes(), listPublishableAthletes()]);
      setItems(featured);
      setAthletes(candidates);
    } catch {
      setError('No fue posible cargar los destacados. Intentá nuevamente.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEditing = (item) => {
    setEditing(item);
    setDraft({ athleteId: item.athleteId, displayOrder: String(item.displayOrder), startsAt: toLocalInput(item.startsAt), endsAt: toLocalInput(item.endsAt) });
    setNotice(null);
  };

  const reset = () => {
    setEditing(null);
    setDraft({ athleteId: '', displayOrder: '', startsAt: '', endsAt: '' });
    setNotice(null);
  };

  const save = async (event) => {
    event.preventDefault();
    setNotice(null);
    const entry = {
      athleteId: draft.athleteId,
      displayOrder: Number(draft.displayOrder),
      startsAt: draft.startsAt || null,
      endsAt: draft.endsAt || null,
    };
    const validation = featuredWindow([entry]);
    if (!validation.ok) {
      setNotice({ type: 'error', text: 'Revisá la selección: orden entre 1 y 6, atleta elegido, y ventana con inicio anterior al fin.' });
      return;
    }
    setBusy(true);
    try {
      await saveFeaturedAthlete({ ...entry, id: editing?.id });
      reset();
      setNotice({ type: 'success', text: 'Destacado guardado.' });
      await load();
    } catch {
      setNotice({ type: 'error', text: 'No fue posible guardar el destacado. Intentá nuevamente.' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item) => {
    setBusy(true);
    setNotice(null);
    try {
      await removeFeaturedAthlete(item.id);
      if (editing?.id === item.id) reset();
      setNotice({ type: 'success', text: 'Destacado eliminado.' });
      await load();
    } catch {
      setNotice({ type: 'error', text: 'No fue posible eliminar el destacado. Intentá nuevamente.' });
    } finally {
      setBusy(false);
    }
  };

  const activeIds = new Set((featuredWindow(items ?? [], new Date()).active).map((item) => item.athleteId));
  const unusedAthletes = athletes.filter((candidate) => !items?.some((item) => item.athleteId === candidate.id) || editing?.athleteId === candidate.id);

  return (
    <section aria-labelledby="admin-featured-title">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-asanda-deep">Módulo editorial</p>
        <h1 id="admin-featured-title" className="mt-2 font-display text-3xl font-bold sm:text-4xl">Atletas destacados</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Selecciones visibles en el inicio del portal, ordenadas del 1 al 6. Sin fechas, la ventana queda activa desde ahora.</p>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
          <button type="button" onClick={load} className="ml-3 inline-flex items-center gap-1 underline underline-offset-2">
            <RefreshCw size={14} aria-hidden="true" />
            Reintentar
          </button>
        </p>
      )}

      {notice && (
        <p role={notice.type === 'error' ? 'alert' : 'status'} className={`mt-6 rounded-md border p-4 text-sm font-semibold ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {notice.text}
        </p>
      )}

      <form onSubmit={save} className="mt-6 rounded-[14px] border border-asanda-line bg-white p-5 sm:p-6" aria-label={editing ? 'Editar selección destacada' : 'Nueva selección destacada'}>
        <h2 className="font-display text-xl font-bold text-asanda-ink">{editing ? `Editar: ${editing.athleteName}` : 'Nueva selección'}</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm font-bold text-asanda-ink">
            Atleta publicado
            <select className="mt-2 min-h-12 w-full rounded-md border border-asanda-line px-3 font-normal" required value={draft.athleteId} onChange={(event) => setDraft((prev) => ({ ...prev, athleteId: event.target.value }))}>
              <option value="">Elegí un atleta…</option>
              {unusedAthletes.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.displayName}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-asanda-ink">
            Orden (1-6)
            <input className="mt-2 min-h-12 w-full rounded-md border border-asanda-line px-3 font-normal" type="number" min="1" max="6" step="1" required value={draft.displayOrder} onChange={(event) => setDraft((prev) => ({ ...prev, displayOrder: event.target.value }))} />
          </label>
          <label className="block text-sm font-bold text-asanda-ink">
            Inicio de ventana
            <input className="mt-2 min-h-12 w-full rounded-md border border-asanda-line px-3 font-normal" type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft((prev) => ({ ...prev, startsAt: event.target.value }))} />
          </label>
          <label className="block text-sm font-bold text-asanda-ink">
            Fin de ventana
            <input className="mt-2 min-h-12 w-full rounded-md border border-asanda-line px-3 font-normal" type="datetime-local" value={draft.endsAt} onChange={(event) => setDraft((prev) => ({ ...prev, endsAt: event.target.value }))} />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 bg-asanda-orange-strong px-5 font-bold text-white transition-colors hover:bg-[#a94320] disabled:cursor-wait disabled:opacity-70">
            <Plus size={18} aria-hidden="true" />
            {busy ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Agregar destacado')}
          </button>
          {editing && (
            <button type="button" onClick={reset} className="min-h-11 px-3 font-bold text-asanda-deep hover:text-asanda-orange">Cancelar</button>
          )}
        </div>
      </form>

      {!items && !error && (
        <p role="status" className="mt-6 rounded-md border border-asanda-line bg-white p-6 text-sm font-semibold text-asanda-deep">Cargando destacados…</p>
      )}

      {items && items.length === 0 && !error && (
        <div className="mt-6 rounded-[14px] border border-dashed border-asanda-line bg-white p-10 text-center">
          <Star className="mx-auto text-asanda-deep" size={36} aria-hidden="true" />
          <p className="mt-3 font-bold text-asanda-ink">Todavía no hay atletas destacados.</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Agregá la primera selección con el formulario.</p>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="mt-6 space-y-3">
          {items.map((item) => {
            const isActive = activeIds.has(item.athleteId);
            return (
              <li key={item.id} className="rounded-[14px] border border-asanda-line bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-asanda-deep font-display text-lg font-bold text-white">{item.displayOrder}</span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-asanda-ink">{item.athleteName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(item.startsAt)} → {formatDate(item.endsAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {isActive ? 'Activa' : 'Fuera de ventana'}
                    </span>
                    <button type="button" disabled={busy} onClick={() => startEditing(item)} className="inline-flex min-h-10 items-center gap-1.5 px-3 font-bold text-asanda-deep hover:bg-asanda-mist disabled:opacity-60" aria-label={`Editar ${item.athleteName}`}>
                      <Pencil size={16} aria-hidden="true" />
                      Editar
                    </button>
                    <button type="button" disabled={busy} onClick={() => remove(item)} className="inline-flex min-h-10 items-center gap-1.5 px-3 font-bold text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-60" aria-label={`Quitar ${item.athleteName}`}>
                      <Trash2 size={16} aria-hidden="true" />
                      Quitar
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default AdminFeaturedPage;