import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { archiveAdminClub, formatClubError, getAdminClub, getAdminClubs, getClubReferences, saveAdminClub } from '../services/admin/clubs';

const blank = { id: '', name: '', shortName: '', slug: '', description: '', foundedYear: '', logoAssetId: '', publicationStatus: 'draft', contacts: [] };
const contact = { id: '', contactType: 'email', label: '', value: '', url: '', isPublic: false, sortOrder: 0 };
const field = 'mt-2 min-h-11 w-full rounded-md border border-asanda-line bg-white px-3 text-asanda-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-asanda-orange dark:border-slate-600 dark:bg-slate-800 dark:text-white';
const panel = 'rounded-[14px] border border-asanda-line bg-white p-5 dark:border-slate-700 dark:bg-dark-surface sm:p-6';
const labels = { draft: 'Borrador', published: 'Publicado', archived: 'Archivado' };
const toForm = (club) => ({
  ...blank, id: club?.id || '', name: club?.name || '', shortName: club?.short_name || '', slug: club?.slug || '',
  description: club?.description || '', foundedYear: club?.founded_year ? String(club.founded_year) : '',
  logoAssetId: club?.logo_asset_id || '', publicationStatus: club?.publication_status || 'draft',
  contacts: (club?.contacts || []).map((item, index) => ({ id: item.id || '', contactType: item.contact_type, label: item.label || '', value: item.value, url: item.url || '', isPublic: item.is_public === true, sortOrder: item.sort_order ?? index })),
});

const Notice = ({ status, error, empty }) => {
  if (status === 'loading') return <p role="status" className={panel}>Cargando clubes…</p>;
  if (status === 'error') return <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">{error}</p>;
  if (empty) return <p role="status" className={panel}>No hay clubes para administrar.</p>;
  return null;
};

const ClubList = () => {
  const [state, setState] = useState({ status: 'loading', clubs: [], error: '' });
  useEffect(() => {
    let active = true;
    getAdminClubs().then((clubs) => active && setState({ status: 'ready', clubs, error: '' })).catch((reason) => active && setState({ status: 'error', clubs: [], error: formatClubError(reason) }));
    return () => { active = false; };
  }, []);
  return <section aria-labelledby="clubs-title" className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-asanda-deep">Organizaciones</p><h1 id="clubs-title" className="mt-2 font-display text-3xl font-bold">Administración de clubes</h1><p className="mt-2 text-slate-600 dark:text-slate-300">Gestioná identidad, contactos, logotipos y publicación sin borrar el historial.</p></div><Link to="/admin/clubes/nuevo" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-asanda-deep px-4 font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-asanda-orange"><Plus size={17} aria-hidden="true" />Nuevo club</Link></div>
    <Notice status={state.status} error={state.error} empty={state.status === 'ready' && !state.clubs.length} />
    {state.status === 'ready' && <div className="grid gap-4 md:grid-cols-2">{state.clubs.map((club) => <article key={club.id} className={panel}><div className="flex justify-between gap-3"><div><p className="text-xs font-bold uppercase text-asanda-deep">{club.short_name || club.slug}</p><h2 className="mt-1 text-xl font-bold">{club.name}</h2></div><span className="h-fit rounded-full bg-asanda-mist px-3 py-1 text-xs font-bold text-asanda-deep">{labels[club.publication_status]}</span></div><p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{club.contacts.length} contactos</p><Link className="mt-4 inline-flex min-h-11 items-center font-bold text-asanda-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-asanda-orange" to={`/admin/clubes/${club.id}`}>Editar club</Link></article>)}</div>}
  </section>;
};

const Contact = ({ item, index, change, remove }) => <div className="rounded-md border border-asanda-line bg-asanda-foam p-4 dark:border-slate-600 dark:bg-slate-800/70"><div className="grid gap-4 sm:grid-cols-2">
  <label className="text-sm font-bold">Tipo de contacto<select className={field} value={item.contactType} onChange={(event) => change(index, 'contactType', event.target.value)}>{[['email', 'Correo electrónico'], ['phone', 'Teléfono'], ['address', 'Dirección'], ['website', 'Sitio web'], ['social', 'Red social']].map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
  <label className="text-sm font-bold">Etiqueta<input className={field} value={item.label} onChange={(event) => change(index, 'label', event.target.value)} /></label>
  <label className="text-sm font-bold sm:col-span-2">Valor<input required className={field} value={item.value} onChange={(event) => change(index, 'value', event.target.value)} /></label>
  <label className="text-sm font-bold sm:col-span-2">URL segura (opcional)<input type="url" placeholder="https://" className={field} value={item.url} onChange={(event) => change(index, 'url', event.target.value)} /></label>
  <label className="flex min-h-11 items-center gap-3 text-sm font-bold"><input type="checkbox" checked={item.isPublic} onChange={(event) => change(index, 'isPublic', event.target.checked)} />Visibilidad pública</label>
  <button type="button" onClick={() => remove(index)} className="inline-flex min-h-11 items-center justify-center gap-2 font-bold text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700 sm:justify-self-end"><Trash2 size={16} aria-hidden="true" />Quitar contacto</button>
</div></div>;

const ClubForm = ({ clubId }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [form, setForm] = useState(blank);
  const [media, setMedia] = useState([]);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([getClubReferences(), clubId ? getAdminClub(clubId) : null]).then(([references, club]) => {
      if (!active) return;
      const next = toForm(club);
      next.logoAssetId = references.media.some((asset) => asset.id === next.logoAssetId) ? next.logoAssetId : '';
      setMedia(references.media); setForm(next); setStatus('ready');
    }).catch((reason) => { if (active) { setMessage({ error: true, text: formatClubError(reason) }); setStatus('error'); } });
    return () => { active = false; };
  }, [clubId]);
  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const changeContact = (index, name, value) => setForm((current) => ({ ...current, contacts: current.contacts.map((item, position) => position === index ? { ...item, [name]: value } : item) }));
  const save = async (publicationStatus) => {
    setBusy(true); setMessage(null);
    try { const saved = await saveAdminClub({ ...form, publicationStatus }, publicationStatus); setForm(toForm(saved)); setMessage({ text: publicationStatus === 'published' ? 'Club publicado correctamente.' : 'Borrador guardado correctamente.' }); if (!clubId) navigate(`/admin/clubes/${saved.id}`); }
    catch (reason) { setMessage({ error: true, text: formatClubError(reason) }); } finally { setBusy(false); }
  };
  const archive = async () => {
    setBusy(true); setMessage(null);
    try { await archiveAdminClub(clubId); update('publicationStatus', 'archived'); setMessage({ text: 'Club archivado; sus membresías y resultados históricos permanecen intactos.' }); }
    catch (reason) { setMessage({ error: true, text: formatClubError(reason) }); } finally { setBusy(false); }
  };
  if (status !== 'ready') return <section><h1 className="font-display text-3xl font-bold">Administración de clubes</h1><Notice status={status} error={message?.text} /></section>;
  return <section aria-labelledby="club-title" className="space-y-6"><div><button type="button" className="min-h-11 font-bold text-asanda-deep" onClick={() => navigate('/admin/clubes')}>Volver a clubes</button><h1 id="club-title" className="mt-3 font-display text-3xl font-bold">{form.name || (clubId ? 'Editar club' : 'Nuevo club')}</h1><p className="mt-2 text-slate-600 dark:text-slate-300">Los contactos privados quedan fuera del directorio público. Estado: {labels[form.publicationStatus]}.</p></div>
    {message && <p role={message.error ? 'alert' : 'status'} className={`rounded-lg border p-4 ${message.error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{message.text}</p>}
    <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); save('draft'); }}><fieldset className={panel}><legend className="px-2 text-xl font-bold">Identidad del club</legend><div className="mt-3 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-bold">Nombre del club<input required className={field} value={form.name} onChange={(event) => update('name', event.target.value)} /></label><label className="text-sm font-bold">Nombre corto<input maxLength="20" className={field} value={form.shortName} onChange={(event) => update('shortName', event.target.value)} /></label>
      <label className="text-sm font-bold">Slug público<input required className={field} value={form.slug} onChange={(event) => update('slug', event.target.value)} /><span className="mt-1 block text-xs font-normal">Se normaliza y no puede duplicarse.</span></label><label className="text-sm font-bold">Año de fundación<input type="number" min="1800" max="2200" className={field} value={form.foundedYear} onChange={(event) => update('foundedYear', event.target.value)} /></label>
      <label className="text-sm font-bold sm:col-span-2">Descripción<textarea className={`${field} min-h-24 py-3`} value={form.description} onChange={(event) => update('description', event.target.value)} /></label>
    </div></fieldset>
    <fieldset className={panel}><legend className="px-2 text-xl font-bold">Logotipo aprobado</legend><label className="mt-3 block text-sm font-bold">Imagen pública de Cloudinary<select className={field} value={form.logoAssetId} onChange={(event) => update('logoAssetId', event.target.value)}><option value="">Sin logotipo</option>{media.map((asset) => <option key={asset.id} value={asset.id}>{asset.alt_text}</option>)}</select></label></fieldset>
    <fieldset className={panel}><legend className="px-2 text-xl font-bold">Contactos</legend><div className="mt-3 space-y-4">{form.contacts.map((item, index) => <Contact key={`${item.id}-${index}`} item={item} index={index} change={changeContact} remove={(position) => setForm((current) => ({ ...current, contacts: current.contacts.filter((_, itemIndex) => itemIndex !== position) }))} />)}</div><button type="button" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-asanda-deep px-4 font-bold text-asanda-deep" onClick={() => update('contacts', [...form.contacts, { ...contact, sortOrder: form.contacts.length }])}><Plus size={17} aria-hidden="true" />Agregar contacto</button></fieldset>
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end"><button disabled={busy} type="submit" className="min-h-12 rounded-md border border-asanda-deep px-5 font-bold text-asanda-deep disabled:opacity-60">Guardar borrador</button><button disabled={busy} type="button" onClick={() => save('published')} className="min-h-12 rounded-md bg-asanda-orange-strong px-5 font-bold text-white disabled:opacity-60">Publicar club</button>{clubId && form.publicationStatus !== 'archived' && <button disabled={busy} type="button" onClick={archive} className="min-h-12 rounded-md border border-red-700 px-5 font-bold text-red-700 disabled:opacity-60">Archivar club</button>}</div></form>
  </section>;
};

export default function AdminClubManager({ clubId, listOnly = false }) { return listOnly ? <ClubList /> : <ClubForm clubId={clubId} />; }
