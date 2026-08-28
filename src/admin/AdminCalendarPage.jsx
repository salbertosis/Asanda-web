import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, CalendarDays, Edit3, MapPin, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  EVENT_ROUNDS, EVENT_STATUSES, SEX_CLASSES, deleteAdminEvent, formatCalendarError, formatCaracasDateTimeInput,
  createAdminCalendar, getAdminCalendar, getAdminCompetition, getAdminVenue, getCalendarReferences, listActiveDisciplines, listAdminCalendars, listAdminEvents,
  listAdminVenues, listCalendarCompetitions, reorderAdminEvents, saveAdminCompetition, saveAdminEvent, saveAdminVenue, setAdminCompetitionStatus,
} from '../services/admin/calendar';

const field = 'mt-2 min-h-11 w-full rounded-md border border-asanda-line bg-white px-3 text-asanda-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-asanda-orange dark:border-slate-600 dark:bg-slate-800 dark:text-white';
const panel = 'rounded-[14px] border border-asanda-line bg-white p-5 dark:border-slate-700 dark:bg-dark-surface sm:p-6';
const statusLabels = { draft: 'Borrador', scheduled: 'Programada', in_progress: 'En curso', completed: 'Completada', postponed: 'Pospuesta', cancelled: 'Cancelada', archived: 'Archivada' };
const roundLabels = { heat: 'Serie', semifinal: 'Semifinal', final: 'Final', timed_final: 'Final contra reloj' };
const sexLabels = { female: 'Femenino', male: 'Masculino', mixed: 'Mixto', open: 'Abierto' };
const emptyCompetition = { name: '', slug: '', organizerId: '', venueId: '', startsOn: '', endsOn: '', description: '' };
const emptyEvent = { id: '', eventDefinitionId: '', categoryId: '', competitiveSex: '', round: 'timed_final', sequenceNumber: '', scheduledAt: '', status: 'scheduled' };
const jsonDate = (value) => value ? new Date(value).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const venueName = (venue) => venue ? [venue.name, venue.city, venue.region].filter(Boolean).join(', ') : 'Sede por confirmar';
const isFullCalendarContext = (value, calendarId) => value?.id === calendarId && typeof value?.disciplineId === 'string' && Boolean(value?.discipline?.name) && typeof value?.parentSport?.id === 'string' && Boolean(value.parentSport.name) && Number.isInteger(value?.seasonYear);
const Notice = ({ notice }) => notice ? <p role={notice.error ? 'alert' : 'status'} aria-label={notice.error ? undefined : 'Resultado de la operación'} className={`rounded-md border p-4 text-sm font-semibold ${notice.error ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'}`}>{notice.text}</p> : null;

const CalendarHome = () => {
  const [items, setItems] = useState(null); const [error, setError] = useState('');
  const load = useCallback(() => { setItems(null); setError(''); return listAdminCalendars().then(setItems).catch(() => setError('No fue posible cargar los calendarios. Intentá nuevamente.')); }, []);
  useEffect(() => { load(); }, [load]);
  return <section aria-labelledby="admin-calendar-title" className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-asanda-deep dark:text-slate-300">Operaciones deportivas</p><h1 id="admin-calendar-title" className="mt-2 font-display text-3xl font-bold sm:text-4xl">Calendarios</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Organizá las competencias por deporte y año.</p></div><div className="flex flex-col gap-3 sm:flex-row"><Link to="/admin/calendario/sedes" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-asanda-deep px-4 font-bold text-asanda-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-asanda-orange dark:border-slate-400 dark:text-white"><MapPin size={17} aria-hidden="true" />Sedes</Link><Link to="/admin/calendario/nuevo" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-asanda-orange-strong px-4 font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-asanda-orange"><Plus size={17} aria-hidden="true" />Nuevo calendario</Link></div></div>
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}<button type="button" onClick={load} className="ml-3 inline-flex min-h-9 items-center gap-1 font-bold underline"><RefreshCw size={14} aria-hidden="true" />Reintentar</button></p>}
    {!items && !error && <p role="status" className={panel}>Cargando calendarios…</p>}
    {items?.length === 0 && !error && <div className={`${panel} text-center`}><p className="font-bold">Todavía no hay calendarios.</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Creá el primero para organizar sus competencias.</p></div>}
    {items?.length > 0 && <ul className="grid gap-4 md:grid-cols-2">{items.map((item) => <li key={item.id} className={panel}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-asanda-deep dark:text-slate-300">{item.seasonYear}</p><h2 className="mt-1 text-xl font-bold">{item.discipline.name}</h2></div><CalendarDays className="shrink-0 text-asanda-orange" aria-hidden="true" /></div><p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{item.competitionCount} {item.competitionCount === 1 ? 'competencia' : 'competencias'}</p><Link to={`/admin/calendario/${item.id}/competencias`} className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold text-asanda-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-asanda-orange dark:text-white"><Edit3 size={16} aria-hidden="true" />Administrar competencias</Link></li>)}</ul>}
  </section>;
};

const NewCalendarPage = () => {
  const currentYear = new Date().getFullYear(); const navigate = useNavigate(); const [disciplines, setDisciplines] = useState(null); const [form, setForm] = useState({ disciplineId: '', seasonYear: String(currentYear) }); const [notice, setNotice] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { listActiveDisciplines().then(setDisciplines).catch(() => setNotice({ error: true, text: 'No fue posible cargar los deportes. Intentá nuevamente.' })); }, []);
  const save = async (event) => { event.preventDefault(); setBusy(true); setNotice(null); try { const saved = await createAdminCalendar(form); navigate(`/admin/calendario/${saved.id}/competencias`, { replace: true, state: { calendar: saved, notice: saved.existing ? 'Ese calendario ya existía. Abrimos el registro existente.' : 'Calendario creado correctamente.' } }); } catch (error) { setNotice({ error: true, text: formatCalendarError(error) }); } finally { setBusy(false); } };
  return <section aria-labelledby="new-calendar-title" className="space-y-6"><Link to="/admin/calendario" className="inline-flex min-h-10 items-center gap-2 font-bold text-asanda-deep dark:text-white"><ArrowLeft size={16} aria-hidden="true" />Volver a calendarios</Link><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-asanda-deep dark:text-slate-300">Organización anual</p><h1 id="new-calendar-title" className="mt-2 font-display text-3xl font-bold">Nuevo calendario</h1></div><Notice notice={notice} />{!disciplines && !notice && <p role="status" className={panel}>Cargando deportes…</p>}{disciplines && <form className={`${panel} grid gap-5 sm:grid-cols-2`} onSubmit={save}><label className="text-sm font-bold">Deporte<select className={field} required value={form.disciplineId} onChange={(event) => setForm({ ...form, disciplineId: event.target.value })}><option value="">Seleccioná un deporte…</option>{disciplines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm font-bold">Año<input className={field} type="number" required min="2000" max="2100" value={form.seasonYear} onChange={(event) => setForm({ ...form, seasonYear: event.target.value })} /></label><div className="sm:col-span-2 sm:text-right"><button type="submit" disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-asanda-deep px-5 font-bold text-white disabled:opacity-60"><Save size={17} aria-hidden="true" />{busy ? 'Guardando…' : 'Guardar calendario'}</button></div></form>}</section>;
};

const ContextualCalendarCompetitionsPage = ({ calendarId }) => {
  const { state } = useLocation(); const routedCalendar = state?.calendar?.id === calendarId ? state.calendar : null; const [calendar, setCalendar] = useState(routedCalendar); const [items, setItems] = useState(null); const [notice, setNotice] = useState(state?.notice ? { text: state.notice } : null);
  useEffect(() => { Promise.all([routedCalendar ? Promise.resolve(routedCalendar) : getAdminCalendar(calendarId), listCalendarCompetitions(calendarId)]).then(([context, competitions]) => { if (!context) throw new Error('CALENDAR_NOT_FOUND'); setCalendar(context); setItems(competitions); }).catch((error) => setNotice({ error: true, text: formatCalendarError(error) })); }, [calendarId, routedCalendar]);
  if (!calendar) return <section className="space-y-5"><Notice notice={notice} />{!notice?.error && <p role="status" className={panel}>Cargando competencias…</p>}</section>;
  return <section aria-labelledby="calendar-competitions-title" className="space-y-6"><Link to="/admin/calendario" className="inline-flex min-h-10 items-center gap-2 font-bold text-asanda-deep dark:text-white"><ArrowLeft size={16} aria-hidden="true" />Volver a calendarios</Link><Notice notice={notice} /><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-bold text-asanda-deep dark:text-slate-300">{calendar.discipline.name} · {calendar.seasonYear}</p><h1 id="calendar-competitions-title" className="mt-2 font-display text-3xl font-bold">Competencias</h1></div><Link to={`/admin/calendario/${calendar.id}/competencias/nueva`} state={{ calendar }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-asanda-orange-strong px-4 font-bold text-white"><Plus size={17} aria-hidden="true" />Añadir competencia</Link></div>{items?.length === 0 && <p className={panel}>Todavía no hay competencias en este calendario.</p>}{items?.length > 0 && <ul className="grid gap-4 md:grid-cols-2">{items.map((item) => <li key={item.id} className={panel}><p className="text-xs font-bold uppercase tracking-wide text-asanda-deep dark:text-slate-300">{statusLabels[item.status]}</p><h2 className="mt-1 text-xl font-bold">{item.name}</h2><p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{jsonDate(item.starts_on)}{item.ends_on ? ` al ${jsonDate(item.ends_on)}` : ''} · {venueName(item.venue)}</p><Link to={`/admin/calendario/${calendar.id}/competencias/${item.id}`} state={{ calendar, competition: item }} className="mt-4 inline-flex min-h-10 items-center gap-2 font-bold text-asanda-deep dark:text-white"><Edit3 size={16} aria-hidden="true" />Editar competencia</Link></li>)}</ul>}</section>;
};

const VenuePage = ({ venueId, listOnly = false }) => {
  const navigate = useNavigate(); const [items, setItems] = useState(null); const [form, setForm] = useState({ name: '', address: '', city: '', region: '', countryCode: 'VE' }); const [notice, setNotice] = useState(null); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { const venues = await listAdminVenues(); setItems(venues); if (venueId) { const venue = await getAdminVenue(venueId); if (!venue) throw new Error('VENUE_NOT_FOUND'); setForm({ name: venue.name, address: venue.address, city: venue.city, region: venue.region, countryCode: venue.country_code }); } } catch { setNotice({ error: true, text: 'No fue posible cargar las sedes. Intentá nuevamente.' }); } }, [venueId]);
  useEffect(() => { load(); }, [load]);
  const save = async (event) => { event.preventDefault(); setBusy(true); setNotice(null); try { const saved = await saveAdminVenue({ id: venueId, ...form }); setForm({ name: saved.name, address: saved.address, city: saved.city, region: saved.region, countryCode: saved.country_code }); setNotice({ text: 'Sede guardada correctamente.' }); if (!venueId) navigate(`/admin/calendario/sedes/${saved.id}`, { replace: true }); } catch (error) { setNotice({ error: true, text: formatCalendarError(error) }); } finally { setBusy(false); } };
  if (listOnly) return <section aria-labelledby="venues-title" className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-asanda-deep">Referencias del calendario</p><h1 id="venues-title" className="mt-2 font-display text-3xl font-bold">Sedes</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Reutilizá una sede para evitar identidades duplicadas.</p></div><Link to="/admin/calendario/sedes/nueva" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-asanda-orange-strong px-4 font-bold text-white"><Plus size={17} aria-hidden="true" />Nueva sede</Link></div><Link to="/admin/calendario" className="inline-flex min-h-10 items-center gap-2 font-bold text-asanda-deep dark:text-white"><ArrowLeft size={16} aria-hidden="true" />Volver al calendario</Link>{notice && <Notice notice={notice} />}{!items && !notice && <p role="status" className={panel}>Cargando sedes…</p>}{items?.length === 0 && <p role="status" className={panel}>Todavía no hay sedes.</p>}{items?.length > 0 && <ul className="grid gap-4 md:grid-cols-2">{items.map((venue) => <li key={venue.id} className={panel}><h2 className="text-xl font-bold">{venue.name}</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{venueName(venue)}</p><Link to={`/admin/calendario/sedes/${venue.id}`} className="mt-4 inline-flex min-h-10 items-center font-bold text-asanda-deep dark:text-white">Editar sede</Link></li>)}</ul>}</section>;
  if (venueId && !items && !notice) return <p role="status" className={panel}>Cargando sede…</p>;
  return <section aria-labelledby="venue-form-title" className="space-y-6"><Link to="/admin/calendario/sedes" className="inline-flex min-h-10 items-center gap-2 font-bold text-asanda-deep dark:text-white"><ArrowLeft size={16} aria-hidden="true" />Volver a sedes</Link><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-asanda-deep">Referencia reutilizable</p><h1 id="venue-form-title" className="mt-2 font-display text-3xl font-bold">{venueId ? 'Editar sede' : 'Nueva sede'}</h1></div><Notice notice={notice} /><form className={`${panel} grid gap-5 sm:grid-cols-2`} onSubmit={save}><label className="text-sm font-bold sm:col-span-2">Nombre de la sede<input className={field} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label className="text-sm font-bold sm:col-span-2">Dirección pública<input className={field} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label><label className="text-sm font-bold">Ciudad<input className={field} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label><label className="text-sm font-bold">Estado / región<input className={field} value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} /></label><label className="text-sm font-bold">País (ISO)<input className={field} maxLength="2" value={form.countryCode} onChange={(event) => setForm({ ...form, countryCode: event.target.value.toUpperCase() })} /></label><div className="flex items-end sm:justify-end"><button type="submit" disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-asanda-deep px-5 font-bold text-white disabled:opacity-60"><Save size={17} aria-hidden="true" />{busy ? 'Guardando…' : 'Guardar sede'}</button></div></form></section>;
};

const CalendarCompetitionPage = ({ calendarId, competitionId }) => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const routedContext = isFullCalendarContext(state?.calendar, calendarId) ? state.calendar : null;
  const routedCompetition = competitionId && state?.competition?.id === competitionId && state.competition.calendar_id === calendarId ? state.competition : null;
  const [context, setContext] = useState(routedContext);
  const [refs, setRefs] = useState(null);
  const [competition, setCompetition] = useState(routedCompetition);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyCompetition);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const calendar = routedContext || await getAdminCalendar(calendarId);
      if (!calendar) throw new Error('CALENDAR_NOT_FOUND');
      setContext(calendar);
      const [references, item] = await Promise.all([
        getCalendarReferences({ disciplineId: calendar.disciplineId }),
        competitionId ? (routedCompetition || getAdminCompetition(competitionId)) : Promise.resolve(null),
      ]);
      if (competitionId && (!item || item.calendar_id !== calendar.id)) throw new Error('COMPETITION_CALENDAR_MISMATCH');
      const program = item ? await listAdminEvents(item.id) : [];
      setRefs(references);
      setCompetition(item);
      setForm(item ? { name: item.name, slug: item.slug, organizerId: item.organizer_id, venueId: item.venue_id, startsOn: item.starts_on, endsOn: item.ends_on || '', description: item.description || '' } : emptyCompetition);
      setEvents(program);
      setEventForm({ ...emptyEvent, sequenceNumber: String(program.length + 1) });
    } catch (error) {
      setNotice({ error: true, text: formatCalendarError(error) });
    }
  }, [calendarId, competitionId, routedCompetition, routedContext]);

  useEffect(() => { load(); }, [load]);
  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const save = async (status) => {
    setBusy(true);
    setNotice(null);
    try {
      const saved = await saveAdminCompetition({ id: competitionId, calendarId, ...form, publishedAt: competition?.published_at }, status);
      setCompetition(saved);
      setNotice({ text: status === 'draft' ? 'Borrador de competencia guardado.' : 'Competencia publicada.' });
      if (!competitionId) navigate(`/admin/calendario/${calendarId}/competencias/${saved.id}`, { replace: true, state: { competition: saved } });
    } catch (error) {
      setNotice({ error: true, text: formatCalendarError(error) });
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status) => {
    setBusy(true);
    setNotice(null);
    try {
      const saved = await setAdminCompetitionStatus(competition.id, status, competition.published_at);
      setCompetition((current) => ({ ...current, ...saved }));
      setNotice({ text: `Estado actualizado: ${statusLabels[status]}.` });
    } catch (error) {
      setNotice({ error: true, text: formatCalendarError(error) });
    } finally {
      setBusy(false);
    }
  };

  const saveEvent = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await saveAdminEvent(competition.id, eventForm, events);
      const program = await listAdminEvents(competition.id);
      setEvents(program);
      setEventForm({ ...emptyEvent, sequenceNumber: String(program.length + 1) });
      setNotice({ text: 'Evento guardado en el programa.' });
    } catch (error) {
      setNotice({ error: true, text: formatCalendarError(error) });
    } finally {
      setBusy(false);
    }
  };

  const moveEvent = async (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= events.length) return;
    const ordered = [...events];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const renumbered = ordered.map((item, position) => ({ ...item, sequence_number: position + 1 }));
    setBusy(true);
    setNotice(null);
    try {
      await reorderAdminEvents(competition.id, renumbered);
      setEvents(renumbered);
      setNotice({ text: 'Orden del programa actualizado.' });
    } catch (error) {
      setNotice({ error: true, text: formatCalendarError(error) });
    } finally {
      setBusy(false);
    }
  };

  const removeEvent = async (item) => {
    setBusy(true);
    setNotice(null);
    try {
      await deleteAdminEvent(item.id);
      const program = await listAdminEvents(competition.id);
      setEvents(program);
      setEventForm((current) => current.id === item.id ? { ...emptyEvent, sequenceNumber: String(program.length + 1) } : current);
      setNotice({ text: 'Evento quitado del programa.' });
    } catch (error) {
      setNotice({ error: true, text: formatCalendarError(error) });
    } finally {
      setBusy(false);
    }
  };

  const editEvent = (item) => setEventForm({
    id: item.id,
    eventDefinitionId: item.event_definition_id,
    categoryId: item.category_id,
    competitiveSex: item.competitive_sex,
    round: item.round,
    sequenceNumber: String(item.sequence_number),
    scheduledAt: formatCaracasDateTimeInput(item.scheduled_at),
    status: item.status,
  });

  if (!context || !refs) return <section className="space-y-5"><p role={notice?.error ? 'alert' : 'status'} className={panel}>{notice?.text || 'Cargando competencia…'}</p>{notice?.error && <Link to={`/admin/calendario/${calendarId}/competencias`} className="font-bold text-asanda-deep dark:text-white">Volver a las competencias</Link>}</section>;
  return <section aria-labelledby="competition-form-title" className="space-y-6">
    <Link to={`/admin/calendario/${calendarId}/competencias`} className="inline-flex min-h-10 items-center gap-2 font-bold text-asanda-deep dark:text-white"><ArrowLeft size={16} aria-hidden="true" />Volver a las competencias</Link>
    <div>
      <p className="text-sm font-bold text-asanda-deep dark:text-slate-300">{context.discipline.name} · {context.seasonYear}</p>
      <h1 id="competition-form-title" className="mt-2 font-display text-3xl font-bold">{competition?.name || 'Nueva competencia'}</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Deporte: <strong>{context.parentSport.name}</strong>. Estado: <strong>{statusLabels[competition?.status || 'draft']}</strong>.</p>
    </div>
    <Notice notice={notice} />
    <form className={`${panel} grid gap-5 sm:grid-cols-2`} onSubmit={(event) => { event.preventDefault(); save('draft'); }}>
      <label className="text-sm font-bold sm:col-span-2">Nombre de la competencia<input className={field} required value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
      <label className="text-sm font-bold">Slug público<input className={field} required value={form.slug} onChange={(event) => update('slug', event.target.value)} /></label>
      <label className="text-sm font-bold">Organización responsable<select className={field} required value={form.organizerId} onChange={(event) => update('organizerId', event.target.value)}><option value="">Seleccioná una organización…</option>{refs.organizations.filter((item) => item.publication_status !== 'archived').map((item) => <option key={item.id} value={item.id}>{item.short_name || item.name}</option>)}</select></label>
      <label className="text-sm font-bold">Sede<select className={field} value={form.venueId} onChange={(event) => update('venueId', event.target.value)}><option value="">Sede por confirmar</option>{refs.venues.map((item) => <option key={item.id} value={item.id}>{venueName(item)}</option>)}</select></label>
      <label className="text-sm font-bold">Fecha de inicio<input className={field} type="date" required value={form.startsOn} onChange={(event) => update('startsOn', event.target.value)} /></label>
      <label className="text-sm font-bold">Fecha de finalización<input className={field} type="date" value={form.endsOn} onChange={(event) => update('endsOn', event.target.value)} /></label>
      <label className="text-sm font-bold sm:col-span-2">Descripción pública<textarea className={`${field} min-h-28 py-3`} value={form.description} onChange={(event) => update('description', event.target.value)} /></label>
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-asanda-deep px-5 font-bold text-white disabled:opacity-60"><Save size={17} aria-hidden="true" />Guardar borrador</button>
        <button type="button" disabled={busy} onClick={() => save('scheduled')} className="min-h-11 rounded-md bg-asanda-orange-strong px-5 font-bold text-white disabled:opacity-60">Publicar competencia</button>
      </div>
    </form>
    {competition && <>
      {competition.status !== 'archived' && <section className={`${panel} space-y-3`} aria-labelledby="competition-status-title">
        <h2 id="competition-status-title" className="text-xl font-bold">Estado de la competencia</h2>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={busy} onClick={() => changeStatus('postponed')} className="min-h-11 rounded-md border border-amber-700 px-4 font-bold text-amber-800 disabled:opacity-60 dark:text-amber-300">Posponer competencia</button>
          <button type="button" disabled={busy} onClick={() => changeStatus('cancelled')} className="min-h-11 rounded-md border border-red-700 px-4 font-bold text-red-700 disabled:opacity-60 dark:text-red-300">Cancelar competencia</button>
          <button type="button" disabled={busy} onClick={() => changeStatus('completed')} className="min-h-11 rounded-md border border-emerald-700 px-4 font-bold text-emerald-800 disabled:opacity-60 dark:text-emerald-300">Marcar como completada</button>
          <button type="button" disabled={busy} onClick={() => changeStatus('archived')} className="min-h-11 rounded-md border border-slate-600 px-4 font-bold text-slate-700 disabled:opacity-60 dark:text-slate-200">Archivar competencia</button>
        </div>
      </section>}
      <section className={`${panel} space-y-5`} aria-labelledby="program-title">
        <div>
          <h2 id="program-title" className="font-display text-2xl font-bold">Programa ordenado de eventos</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Cada secuencia es única y se puede reordenar sin perder referencias históricas.</p>
        </div>
        <form className="grid gap-4 rounded-md border border-asanda-line bg-asanda-foam p-4 dark:border-slate-600 dark:bg-slate-800/60 sm:grid-cols-3" onSubmit={saveEvent}>
          <label className="text-sm font-bold">Evento activo<select className={field} required value={eventForm.eventDefinitionId} onChange={(event) => setEventForm({ ...eventForm, eventDefinitionId: event.target.value })}><option value="">Seleccioná una prueba…</option>{refs.definitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm font-bold">Categoría<select className={field} value={eventForm.categoryId} onChange={(event) => setEventForm({ ...eventForm, categoryId: event.target.value })}><option value="">Sin categoría</option>{refs.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm font-bold">Secuencia<input className={field} type="number" min="1" required value={eventForm.sequenceNumber} onChange={(event) => setEventForm({ ...eventForm, sequenceNumber: event.target.value })} /></label>
          <label className="text-sm font-bold">Sexo competitivo<select className={field} value={eventForm.competitiveSex} onChange={(event) => setEventForm({ ...eventForm, competitiveSex: event.target.value })}><option value="">Sin clase</option>{SEX_CLASSES.map((item) => <option key={item} value={item}>{sexLabels[item]}</option>)}</select></label>
          <label className="text-sm font-bold">Ronda<select className={field} value={eventForm.round} onChange={(event) => setEventForm({ ...eventForm, round: event.target.value })}>{EVENT_ROUNDS.map((item) => <option key={item} value={item}>{roundLabels[item]}</option>)}</select></label>
          <label className="text-sm font-bold">Horario<input className={field} type="datetime-local" value={eventForm.scheduledAt} onChange={(event) => setEventForm({ ...eventForm, scheduledAt: event.target.value })} /></label>
          <label className="text-sm font-bold">Estado<select className={field} value={eventForm.status} onChange={(event) => setEventForm({ ...eventForm, status: event.target.value })}>{EVENT_STATUSES.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label>
          <div className="flex items-end gap-3 sm:col-span-2">
            <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-asanda-deep px-4 font-bold text-white disabled:opacity-60"><Plus size={17} aria-hidden="true" />{eventForm.id ? 'Guardar evento' : 'Agregar evento'}</button>
            {eventForm.id && <button type="button" disabled={busy} onClick={() => setEventForm({ ...emptyEvent, sequenceNumber: String(events.length + 1) })} className="min-h-11 font-bold text-asanda-deep disabled:opacity-60 dark:text-white">Cancelar edición</button>}
          </div>
        </form>
        {events.length === 0 && <p role="status" className="rounded-md border border-dashed border-asanda-line p-5 text-sm">Todavía no hay eventos en el programa.</p>}
        {events.length > 0 && <ol className="space-y-3" aria-label="Eventos ordenados de la competencia">
          {events.map((item, index) => <li key={item.id} className="flex flex-col gap-3 rounded-md border border-asanda-line p-4 sm:flex-row sm:items-center">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-asanda-deep font-bold text-white">{item.sequence_number}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{refs.definitions.find((definition) => definition.id === item.event_definition_id)?.name || 'Evento no disponible'}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{roundLabels[item.round]} · {item.competitive_sex ? sexLabels[item.competitive_sex] : 'Sexo abierto'} · {jsonDate(item.scheduled_at)}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              <button type="button" disabled={busy || index === 0} onClick={() => moveEvent(index, -1)} className="inline-flex min-h-10 items-center gap-1 px-2 font-bold text-asanda-deep disabled:opacity-40 dark:text-white" aria-label={`Subir evento ${item.sequence_number}`}><ArrowUp size={16} aria-hidden="true" />Subir</button>
              <button type="button" disabled={busy || index === events.length - 1} onClick={() => moveEvent(index, 1)} className="inline-flex min-h-10 items-center gap-1 px-2 font-bold text-asanda-deep disabled:opacity-40 dark:text-white" aria-label={`Bajar evento ${item.sequence_number}`}><ArrowDown size={16} aria-hidden="true" />Bajar</button>
              <button type="button" disabled={busy} onClick={() => editEvent(item)} className="inline-flex min-h-10 items-center gap-1 px-2 font-bold text-asanda-deep disabled:opacity-60 dark:text-white" aria-label={`Editar evento ${item.sequence_number}`}><Edit3 size={16} aria-hidden="true" />Editar</button>
              <button type="button" disabled={busy} onClick={() => removeEvent(item)} className="inline-flex min-h-10 items-center gap-1 px-2 font-bold text-red-700 disabled:opacity-60 dark:text-red-300" aria-label={`Eliminar evento ${item.sequence_number}`}><Trash2 size={16} aria-hidden="true" />Eliminar</button>
            </div>
          </li>)}
        </ol>}
      </section>
    </>}
  </section>;
};

const LegacyCompetitionPage = ({ competitionId }) => {
  const [target, setTarget] = useState(competitionId ? null : '/admin/calendario');
  useEffect(() => { if (competitionId) getAdminCompetition(competitionId).then((item) => setTarget(item?.calendar_id ? `/admin/calendario/${item.calendar_id}/competencias/${item.id}` : '/admin/calendario')).catch(() => setTarget('/admin/calendario')); }, [competitionId]);
  return target ? <Navigate to={target} replace /> : <p role="status" className={panel}>Abriendo la competencia en su calendario…</p>;
};

export default function AdminCalendarPage({ view = 'calendar', calendarId, competitionId, venueId }) {
  if (view === 'venues') return <VenuePage listOnly />;
  if (view === 'venue-form') return <VenuePage venueId={venueId} />;
  if (view === 'competition') return <CalendarCompetitionPage calendarId={calendarId} competitionId={competitionId} />;
  if (view === 'legacy-competition') return <LegacyCompetitionPage competitionId={competitionId} />;
  if (view === 'new-calendar') return <NewCalendarPage />;
  if (view === 'calendar-competitions') return <ContextualCalendarCompetitionsPage calendarId={calendarId} />;
  return <CalendarHome />;
}
