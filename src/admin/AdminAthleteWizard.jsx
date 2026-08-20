import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Image, Plus, Save, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  addAthleteCategory,
  addAthleteDiscipline,
  addAthleteMembership,
  formatAthleteError,
  getAdminAthlete,
  getAthleteReferences,
  removeAthleteRelation,
  saveAdminAthlete,
} from '../services/admin/athletes';

const emptyForm = {
  displayName: '',
  preferredName: '',
  competitiveSex: '',
  birthYearPublic: '',
  photoAssetId: '',
  publicationStatus: 'draft',
  profileConsent: false,
  photoConsent: false,
  resultsConsent: false,
};

const emptyCategory = { categoryId: '', validFrom: '', validTo: '' };
const emptyDiscipline = { disciplineId: '', isPrimary: false, validFrom: '', validTo: '' };
const emptyMembership = { organizationId: '', membershipType: 'associated', validFrom: '', validTo: '' };
const relationKeys = { category: 'categories', discipline: 'disciplines', membership: 'memberships' };

const AdminAthleteWizard = ({ athleteId }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [pageError, setPageError] = useState(null);
  const [references, setReferences] = useState({ media: [], categories: [], disciplines: [], organizations: [] });
  const [athlete, setAthlete] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [relations, setRelations] = useState({ categories: [], disciplines: [], memberships: [] });
  const [activePanel, setActivePanel] = useState(null);
  const [category, setCategory] = useState(emptyCategory);
  const [discipline, setDiscipline] = useState(emptyDiscipline);
  const [membership, setMembership] = useState(emptyMembership);
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setPageError(null);

    Promise.all([
      getAthleteReferences(),
      athleteId ? getAdminAthlete(athleteId) : Promise.resolve(null),
    ]).then(([loadedReferences, loadedAthlete]) => {
      if (!active) return;
      setReferences(loadedReferences);
      setAthlete(loadedAthlete);
      if (loadedAthlete) {
        setForm({
          displayName: loadedAthlete.display_name,
          preferredName: loadedAthlete.preferred_name,
          competitiveSex: loadedAthlete.competitive_sex || '',
          birthYearPublic: loadedAthlete.birth_year_public ? String(loadedAthlete.birth_year_public) : '',
          photoAssetId: loadedAthlete.photo_asset_id,
          publicationStatus: loadedAthlete.publication_status,
          profileConsent: Boolean(loadedAthlete.consents.public_profile),
          photoConsent: Boolean(loadedAthlete.consents.photo),
          resultsConsent: Boolean(loadedAthlete.consents.results_publication),
        });
        setRelations({
          categories: loadedAthlete.categories,
          disciplines: loadedAthlete.disciplines,
          memberships: loadedAthlete.memberships,
        });
      }
      setStatus('ready');
    }).catch((error) => {
      if (active) {
        setPageError(formatAthleteError(error));
        setStatus('error');
      }
    });

    return () => { active = false; };
  }, [athleteId]);

  const updateForm = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const updateCheck = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.checked }));

  const saveProfile = async (publicationStatus) => {
    setBusy('profile');
    setMessage(null);
    try {
      const saved = await saveAdminAthlete({ id: athleteId, ...form, publicationStatus });
      setAthlete((current) => ({ ...(current || {}), ...saved }));
      setForm((current) => ({ ...current, publicationStatus }));
      setMessage({ type: 'success', text: publicationStatus === 'published' ? 'Atleta publicado correctamente.' : 'Borrador guardado correctamente.' });
      if (!athleteId) navigate(`/admin/atletas/${saved.id}`);
    } catch (error) {
      setMessage({ type: 'error', text: formatAthleteError(error) });
    } finally {
      setBusy(null);
    }
  };

  const addRelation = async (type) => {
    if (!athleteId) {
      setMessage({ type: 'error', text: 'Guardá primero el borrador del atleta para agregar relaciones.' });
      return;
    }
    const values = type === 'category' ? category : type === 'discipline' ? discipline : membership;
    const save = type === 'category' ? addAthleteCategory : type === 'discipline' ? addAthleteDiscipline : addAthleteMembership;
    setBusy(type);
    setMessage(null);
    try {
      const saved = await save(athleteId, values);
      setRelations((current) => ({ ...current, [relationKeys[type]]: [...current[relationKeys[type]], saved] }));
      setActivePanel(null);
      if (type === 'category') setCategory(emptyCategory);
      if (type === 'discipline') setDiscipline(emptyDiscipline);
      if (type === 'membership') setMembership(emptyMembership);
      setMessage({ type: 'success', text: 'Relación guardada correctamente.' });
    } catch (error) {
      setMessage({ type: 'error', text: formatAthleteError(error) });
    } finally {
      setBusy(null);
    }
  };

  const removeRelation = async (type, table, filters) => {
    if (!filters || Object.values(filters).some((value) => !value)) return;
    setBusy(`remove-${type}`);
    setMessage(null);
    try {
      const { error } = await removeAthleteRelation(table, filters);
      if (error) throw error;
      setRelations((current) => ({ ...current, [relationKeys[type]]: current[relationKeys[type]].filter((item) => type === 'discipline' ? item.discipline_id !== filters.discipline_id : item.id !== filters.id) }));
      setMessage({ type: 'success', text: 'Relación quitada correctamente.' });
    } catch (error) {
      setMessage({ type: 'error', text: formatAthleteError(error) });
    } finally {
      setBusy(null);
    }
  };

  if (status === 'loading') return <section aria-labelledby="athlete-wizard-title"><h1 id="athlete-wizard-title" className="font-display text-3xl font-bold">{athleteId ? 'Editar atleta' : 'Nuevo atleta'}</h1><p className="mt-4" role="status">Cargando datos del atleta…</p></section>;
  if (status === 'error') return <section aria-labelledby="athlete-wizard-title"><h1 id="athlete-wizard-title" className="font-display text-3xl font-bold">Administración de atletas</h1><p className="mt-4 rounded-lg bg-red-50 p-4 text-red-800" role="alert">{pageError}</p></section>;

  const title = athlete?.display_name || (athleteId ? 'Editar atleta' : 'Nuevo atleta');
  const formField = 'mt-2 min-h-11 w-full rounded-md border border-asanda-line bg-white px-3 text-asanda-ink dark:border-slate-600 dark:bg-slate-800 dark:text-white';

  return (
    <section aria-labelledby="athlete-wizard-title" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button type="button" onClick={() => navigate('/admin')} className="inline-flex min-h-10 items-center gap-2 font-bold text-asanda-deep hover:text-asanda-orange dark:text-slate-100 dark:hover:text-asanda-orange"><ArrowLeft size={17} aria-hidden="true" /> Volver al panel</button>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-asanda-deep dark:text-slate-300">Asistente de atleta</p>
          <h1 id="athlete-wizard-title" className="mt-2 font-display text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Completá únicamente información pública aprobada. Los datos privados no forman parte de este formulario.</p>
        </div>
        <span className="inline-flex min-h-9 items-center gap-2 self-start rounded-full bg-asanda-mist px-3 text-xs font-bold uppercase tracking-wide text-asanda-deep"><Check size={15} aria-hidden="true" /> {form.publicationStatus === 'published' ? 'Publicado' : 'Borrador'}</span>
      </div>

      {message && <p role={message.type === 'error' ? 'alert' : 'status'} className={`rounded-lg border p-4 text-sm ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{message.text}</p>}

      <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); saveProfile('draft'); }}>
        <ol className="grid gap-2 text-xs font-bold uppercase tracking-wide text-asanda-deep sm:grid-cols-4" aria-label="Pasos del asistente">
          <li className="rounded-md bg-asanda-mist p-3">1. Perfil público</li>
          <li className="rounded-md bg-asanda-mist p-3">2. Media y consentimiento</li>
          <li className="rounded-md bg-asanda-mist p-3">3. Categorías y disciplinas</li>
          <li className="rounded-md bg-asanda-mist p-3">4. Membresías</li>
        </ol>

        <fieldset className="rounded-[14px] border border-asanda-line bg-white p-5 sm:p-6 dark:border-slate-700 dark:bg-dark-surface">
          <legend className="px-2 font-display text-2xl font-bold">Perfil público</legend>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-bold">Nombre público<input className={formField} type="text" required value={form.displayName} onChange={updateForm('displayName')} /></label>
            <label className="text-sm font-bold">Nombre preferido<span className="sr-only"> (opcional)</span><input className={formField} type="text" value={form.preferredName} onChange={updateForm('preferredName')} /></label>
            <label className="text-sm font-bold">Sexo competitivo<select className={formField} value={form.competitiveSex} onChange={updateForm('competitiveSex')}><option value="">Sin especificar</option><option value="female">Femenino</option><option value="male">Masculino</option><option value="mixed">Mixto</option><option value="open">Abierto</option></select></label>
            <label className="text-sm font-bold">Año de nacimiento público<input className={formField} type="number" min="1900" max="2200" inputMode="numeric" value={form.birthYearPublic} onChange={updateForm('birthYearPublic')} /></label>
          </div>
        </fieldset>

        <fieldset className="rounded-[14px] border border-asanda-line bg-white p-5 sm:p-6 dark:border-slate-700 dark:bg-dark-surface">
          <legend className="px-2 font-display text-2xl font-bold">Media y consentimiento</legend>
          <label className="mt-4 block text-sm font-bold">Imagen vinculada<select className={formField} value={form.photoAssetId} onChange={updateForm('photoAssetId')}><option value="">Sin imagen</option>{references.media.map((asset) => <option key={asset.id} value={asset.id}>{asset.alt_text || asset.public_id || 'Imagen aprobada'}</option>)}</select></label>
          <p className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"><Image size={15} aria-hidden="true" /> Solo se muestran referencias de media públicas y aprobadas.</p>
          <div className="mt-5 grid gap-3 text-sm">
            <label className="flex min-h-11 items-start gap-3 rounded-md border border-asanda-line p-3 font-semibold"><input className="mt-1 size-4" type="checkbox" checked={form.profileConsent} onChange={updateCheck('profileConsent')} /> <span>Consentimiento de perfil público</span></label>
            <label className="flex min-h-11 items-start gap-3 rounded-md border border-asanda-line p-3 font-semibold"><input className="mt-1 size-4" type="checkbox" checked={form.photoConsent} onChange={updateCheck('photoConsent')} /> <span>Consentimiento de foto</span></label>
            <label className="flex min-h-11 items-start gap-3 rounded-md border border-asanda-line p-3 font-semibold"><input className="mt-1 size-4" type="checkbox" checked={form.resultsConsent} onChange={updateCheck('resultsConsent')} /> <span>Consentimiento de resultados</span></label>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-600 dark:text-slate-300">Publicar exige consentimiento de perfil vigente. Una imagen vinculada exige además consentimiento de foto. Los resultados oficiales se mantienen ocultos sin su consentimiento específico.</p>
        </fieldset>

        <fieldset className="rounded-[14px] border border-asanda-line bg-white p-5 sm:p-6 dark:border-slate-700 dark:bg-dark-surface">
          <legend className="px-2 font-display text-2xl font-bold">Categorías</legend>
          <div className="mt-4 space-y-2">{relations.categories.map((item) => <div key={item.id || `${item.category_id}-${item.valid_from}`} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-asanda-foam p-3 text-sm"><span><strong>{item.category?.name || references.categories.find((option) => option.id === item.category_id)?.name || 'Categoría'}</strong> · {item.valid_from} → {item.valid_to || 'vigente'}</span>{item.id && <button type="button" className="inline-flex items-center gap-1 font-bold text-red-700" onClick={() => removeRelation('category', 'athlete_category_assignments', { id: item.id })} disabled={busy === 'remove-category'}><Trash2 size={15} aria-hidden="true" /> Quitar</button>}</div>)}</div>
          <button type="button" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-asanda-deep px-4 font-bold text-asanda-deep hover:bg-asanda-mist dark:border-slate-400 dark:text-slate-100 dark:hover:bg-slate-800" onClick={() => setActivePanel(activePanel === 'category' ? null : 'category')}><Plus size={17} aria-hidden="true" /> Agregar categoría</button>
          {activePanel === 'category' && <div className="mt-4 grid gap-4 rounded-md border border-asanda-line bg-asanda-foam p-4 sm:grid-cols-3"><label className="text-sm font-bold sm:col-span-3">Categoría<select className={formField} value={category.categoryId} onChange={(event) => setCategory({ ...category, categoryId: event.target.value })} required><option value="">Seleccioná una categoría</option>{references.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm font-bold">Desde<input className={formField} type="date" value={category.validFrom} onChange={(event) => setCategory({ ...category, validFrom: event.target.value })} required /></label><label className="text-sm font-bold">Hasta<input className={formField} type="date" value={category.validTo} onChange={(event) => setCategory({ ...category, validTo: event.target.value })} /></label><button type="button" className="min-h-11 rounded-md bg-asanda-deep px-4 font-bold text-white disabled:opacity-60 sm:col-span-3 sm:justify-self-start" onClick={() => addRelation('category')} disabled={busy === 'category'}>{busy === 'category' ? 'Guardando…' : 'Guardar categoría'}</button></div>}
        </fieldset>

        <fieldset className="rounded-[14px] border border-asanda-line bg-white p-5 sm:p-6 dark:border-slate-700 dark:bg-dark-surface">
          <legend className="px-2 font-display text-2xl font-bold">Disciplinas</legend>
          <div className="mt-4 space-y-2">{relations.disciplines.map((item) => <div key={`${item.athlete_id}-${item.discipline_id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-asanda-foam p-3 text-sm"><span><strong>{item.discipline?.name || references.disciplines.find((option) => option.id === item.discipline_id)?.name || 'Disciplina'}</strong>{item.is_primary ? ' · Principal' : ''}</span><button type="button" className="inline-flex items-center gap-1 font-bold text-red-700" onClick={() => removeRelation('discipline', 'athlete_disciplines', { athlete_id: athleteId, discipline_id: item.discipline_id })} disabled={busy === 'remove-discipline'}><Trash2 size={15} aria-hidden="true" /> Quitar</button></div>)}</div>
          <button type="button" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-asanda-deep px-4 font-bold text-asanda-deep hover:bg-asanda-mist dark:border-slate-400 dark:text-slate-100 dark:hover:bg-slate-800" onClick={() => setActivePanel(activePanel === 'discipline' ? null : 'discipline')}><Plus size={17} aria-hidden="true" /> Agregar disciplina</button>
          {activePanel === 'discipline' && <div className="mt-4 grid gap-4 rounded-md border border-asanda-line bg-asanda-foam p-4 sm:grid-cols-3"><label className="text-sm font-bold sm:col-span-3">Disciplina<select className={formField} value={discipline.disciplineId} onChange={(event) => setDiscipline({ ...discipline, disciplineId: event.target.value })} required><option value="">Seleccioná una disciplina</option>{references.disciplines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="flex items-center gap-3 text-sm font-bold sm:col-span-3"><input className="size-4" type="checkbox" checked={discipline.isPrimary} onChange={(event) => setDiscipline({ ...discipline, isPrimary: event.target.checked })} /> Disciplina principal</label><label className="text-sm font-bold">Desde<input className={formField} type="date" value={discipline.validFrom} onChange={(event) => setDiscipline({ ...discipline, validFrom: event.target.value })} required /></label><label className="text-sm font-bold">Hasta<input className={formField} type="date" value={discipline.validTo} onChange={(event) => setDiscipline({ ...discipline, validTo: event.target.value })} /></label><button type="button" className="min-h-11 rounded-md bg-asanda-deep px-4 font-bold text-white disabled:opacity-60 sm:col-span-3 sm:justify-self-start" onClick={() => addRelation('discipline')} disabled={busy === 'discipline'}>{busy === 'discipline' ? 'Guardando…' : 'Guardar disciplina'}</button></div>}
        </fieldset>

        <fieldset className="rounded-[14px] border border-asanda-line bg-white p-5 sm:p-6 dark:border-slate-700 dark:bg-dark-surface">
          <legend className="px-2 font-display text-2xl font-bold">Membresías</legend>
          <div className="mt-4 space-y-2">{relations.memberships.map((item) => <div key={item.id || `${item.organization_id}-${item.valid_from}`} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-asanda-foam p-3 text-sm"><span><strong>{item.organization?.name || references.organizations.find((option) => option.id === item.organization_id)?.name || 'Club'}</strong> · {item.membership_type === 'federated' ? 'Federada' : 'Asociada'} · {item.valid_from} → {item.valid_to || 'vigente'}</span>{item.id && <button type="button" className="inline-flex items-center gap-1 font-bold text-red-700" onClick={() => removeRelation('membership', 'athlete_memberships', { id: item.id })} disabled={busy === 'remove-membership'}><Trash2 size={15} aria-hidden="true" /> Quitar</button>}</div>)}</div>
          <button type="button" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-asanda-deep px-4 font-bold text-asanda-deep hover:bg-asanda-mist dark:border-slate-400 dark:text-slate-100 dark:hover:bg-slate-800" onClick={() => setActivePanel(activePanel === 'membership' ? null : 'membership')}><Plus size={17} aria-hidden="true" /> Agregar membresía</button>
          {activePanel === 'membership' && <div className="mt-4 grid gap-4 rounded-md border border-asanda-line bg-asanda-foam p-4 sm:grid-cols-3"><label className="text-sm font-bold sm:col-span-3">Club<select className={formField} value={membership.organizationId} onChange={(event) => setMembership({ ...membership, organizationId: event.target.value })} required><option value="">Seleccioná un club</option>{references.organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm font-bold">Tipo de membresía<select className={formField} value={membership.membershipType} onChange={(event) => setMembership({ ...membership, membershipType: event.target.value })} required><option value="associated">Asociada</option><option value="federated">Federada</option></select></label><label className="text-sm font-bold">Desde<input className={formField} type="date" value={membership.validFrom} onChange={(event) => setMembership({ ...membership, validFrom: event.target.value })} required /></label><label className="text-sm font-bold">Hasta<input className={formField} type="date" value={membership.validTo} onChange={(event) => setMembership({ ...membership, validTo: event.target.value })} /></label><button type="button" className="min-h-11 rounded-md bg-asanda-deep px-4 font-bold text-white disabled:opacity-60 sm:col-span-3 sm:justify-self-start" onClick={() => addRelation('membership')} disabled={busy === 'membership'}>{busy === 'membership' ? 'Guardando…' : 'Guardar membresía'}</button></div>}
        </fieldset>

        <div className="flex flex-col gap-3 border-t border-asanda-line pt-5 sm:flex-row sm:justify-end">
          <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-asanda-deep px-5 font-bold text-asanda-deep hover:bg-asanda-mist disabled:opacity-60 dark:border-slate-400 dark:text-slate-100 dark:hover:bg-slate-800" disabled={busy === 'profile'}><Save size={17} aria-hidden="true" /> {busy === 'profile' ? 'Guardando…' : 'Guardar borrador'}</button>
          <button type="button" className="min-h-12 rounded-md bg-asanda-orange-strong px-5 font-bold text-white hover:bg-[#a94320] disabled:opacity-60" onClick={() => saveProfile('published')} disabled={busy === 'profile'}>Publicar atleta</button>
        </div>
      </form>
    </section>
  );
};

export default AdminAthleteWizard;
