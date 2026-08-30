import React, { useEffect, useState } from 'react';

const empty = { type: 'national_podium', sourceDocumentId: '', title: '', competitionName: '', place: '1', medal: 'gold', achievedOn: '', validFrom: '', validTo: '' };
const field = 'mt-2 min-h-11 w-full rounded-md border border-asanda-line bg-white px-3 text-asanda-ink dark:border-slate-600 dark:bg-slate-800 dark:text-white';
const fromItem = (item) => item ? { ...empty, ...item, place: item.place ? String(item.place) : '1', medal: item.medal || 'gold' } : empty;

const AthleteAchievementForm = ({ evidence, editing, busy, onSubmit, onCancel }) => {
  const [values, setValues] = useState(empty);
  useEffect(() => { setValues(fromItem(editing)); }, [editing]);
  const update = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event) => { event.preventDefault(); if (await onSubmit(values)) setValues(empty); };
  return (
    <form aria-label={editing ? `Editar logro ${editing.title}` : 'Agregar logro del atleta'} onSubmit={submit} className="mt-5 rounded-md border border-asanda-line bg-asanda-foam p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">Tipo de logro<select className={field} value={values.type} onChange={update('type')}><option value="national_podium">Podio nacional</option><option value="international_medal">Medalla internacional</option><option value="national_team">Selección nacional</option></select></label>
        <label className="text-sm font-bold">Prueba aprobada<select className={field} required value={values.sourceDocumentId} onChange={update('sourceDocumentId')}><option value="">Seleccioná una prueba</option>{evidence.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <p className="text-xs leading-5 text-slate-600 sm:col-span-2 dark:text-slate-300">Sólo aparecen pruebas aprobadas para este atleta. Aprobá primero una prueba pendiente para poder vincularla.</p>
        <label className="text-sm font-bold sm:col-span-2">Título<input className={field} required maxLength="180" value={values.title} onChange={update('title')} placeholder={values.type === 'national_team' ? 'Ej. Selección Venezuela' : 'Ej. Campeón nacional juvenil'} /></label>
        {values.type === 'national_team' ? <>
          <label className="text-sm font-bold">Vigente desde<input className={field} type="date" required value={values.validFrom} onChange={update('validFrom')} /></label>
          <label className="text-sm font-bold">Vigente hasta<span className="sr-only"> (opcional)</span><input className={field} type="date" min={values.validFrom || undefined} value={values.validTo} onChange={update('validTo')} /></label>
        </> : <>
          <label className="text-sm font-bold">Competencia<input className={field} required maxLength="180" value={values.competitionName} onChange={update('competitionName')} /></label>
          <label className="text-sm font-bold">Fecha del logro<input className={field} type="date" required value={values.achievedOn} onChange={update('achievedOn')} /></label>
          {values.type === 'national_podium' ? <label className="text-sm font-bold">Posición<select className={field} value={values.place} onChange={update('place')}><option value="1">1 - Campeón nacional</option><option value="2">2</option><option value="3">3</option></select></label> : <label className="text-sm font-bold">Medalla<select className={field} value={values.medal} onChange={update('medal')}><option value="gold">Oro</option><option value="silver">Plata</option><option value="bronze">Bronce</option></select></label>}
        </>}
      </div>
      <div className="mt-4 flex flex-wrap gap-3"><button className="min-h-11 rounded-md bg-asanda-deep px-4 font-bold text-white disabled:opacity-60" disabled={busy} type="submit">{busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar logro'}</button>{editing && <button className="min-h-11 px-3 font-bold text-asanda-deep dark:text-white" type="button" onClick={onCancel}>Cancelar edición</button>}</div>
    </form>
  );
};

export default AthleteAchievementForm;
