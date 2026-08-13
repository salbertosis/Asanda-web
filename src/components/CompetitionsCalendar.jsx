import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, MapPin, RefreshCw, ShieldCheck, Waves } from 'lucide-react';
import { getCloudinaryUrl } from '../config/cloudinary';

const MONTHS = ['Todos', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DISCIPLINES = [
  { value: 'todos', label: 'Todas' },
  { value: 'natacion', label: 'Natación' },
  { value: 'waterpolo', label: 'Water Polo' },
  { value: 'aguas-abiertas', label: 'Aguas Abiertas' },
];

const getCompetitionLogo = (competition) => {
  if (competition.logoUrl) return competition.logoUrl;
  return competition.logoPublicId
    ? getCloudinaryUrl(competition.logoPublicId, { width: 320, height: 192, crop: 'pad', background: 'transparent' })
    : null;
};

const CompetitionsCalendar = ({ competencias, año, onAñoChange }) => {
  const [mes, setMes] = useState('Todos');
  const [disciplina, setDisciplina] = useState('todos');

  const filteredCompetitions = competencias.filter((competition) => (
    (mes === 'Todos' || competition.mes === mes)
    && (disciplina === 'todos' || competition.deporte === disciplina)
  ));
  const groupedCompetitions = MONTHS.slice(1).flatMap((month) => {
    const items = filteredCompetitions.filter((competition) => competition.mes === month);
    return items.length > 0 ? [{ month, items }] : [];
  });
  const recognizedCount = filteredCompetitions.filter((competition) => competition.reconocido).length;

  const resetFilters = () => {
    onAñoChange(2026);
    setMes('Todos');
    setDisciplina('todos');
  };

  return (
    <section id="calendario" className="bg-slate-50 py-10 dark:bg-slate-950 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-5">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700 dark:text-cyan-400">Agenda oficial ASANDA</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Competiciones {año}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">Consultá fechas, sedes, disciplinas e identidad organizadora de cada encuentro acuático.</p>
              </div>
              <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-700 dark:bg-slate-800" aria-label="Seleccionar año">
                <button type="button" onClick={() => onAñoChange(año - 1)} className="inline-flex size-11 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-white hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-cyan-300" aria-label={`Ver calendario ${año - 1}`}>
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
                <output className="min-w-24 px-4 text-center text-xl font-bold tabular-nums text-slate-950 dark:text-white" aria-live="polite">{año}</output>
                <button type="button" onClick={() => onAñoChange(año + 1)} className="inline-flex size-11 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-white hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-cyan-300" aria-label={`Ver calendario ${año + 1}`}>
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,240px)_1fr_auto] lg:items-end">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Mes</span>
                <select value={mes} onChange={(event) => setMes(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-900">
                  {MONTHS.map((month) => <option key={month} value={month}>{month === 'Todos' ? 'Todos los meses' : month}</option>)}
                </select>
              </label>
              <fieldset className="min-w-0">
                <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Disciplina</legend>
                <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar por disciplina">
                  {DISCIPLINES.map(({ value, label }) => (
                    <button key={value} type="button" aria-pressed={disciplina === value} onClick={() => setDisciplina(value)} className={`min-h-12 shrink-0 rounded-xl border px-4 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${disciplina === value ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <button type="button" onClick={resetFilters} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:text-slate-200 dark:hover:text-cyan-300">
                <RefreshCw size={17} aria-hidden="true" /> Reiniciar
              </button>
            </div>
          </div>

          <div className="grid gap-px bg-slate-200 dark:bg-slate-800 sm:grid-cols-3" aria-label="Resumen del calendario">
            <div className="bg-slate-50 px-5 py-4 dark:bg-slate-900"><p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Programadas</p><p className="mt-1 text-2xl font-bold tabular-nums text-slate-950 dark:text-white">{filteredCompetitions.length}</p></div>
            <div className="bg-slate-50 px-5 py-4 dark:bg-slate-900"><p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Oficiales</p><p className="mt-1 text-2xl font-bold tabular-nums text-slate-950 dark:text-white">{recognizedCount}</p></div>
            <div className="bg-slate-50 px-5 py-4 dark:bg-slate-900"><p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cobertura</p><p className="mt-1 text-base font-bold text-slate-950 dark:text-white">Anzoátegui y región</p></div>
          </div>
        </div>

        <div className="mt-10 space-y-10">
          {groupedCompetitions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900" role="status">
              <CalendarDays className="mx-auto text-blue-700 dark:text-cyan-400" size={34} aria-hidden="true" />
              <h3 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">Sin competencias para estos filtros</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">Probá otro mes, disciplina o año para consultar el resto de la agenda.</p>
            </div>
          ) : groupedCompetitions.map(({ month, items }) => (
            <section key={month} aria-labelledby={`month-${month}`}>
              <div className="mb-4 flex items-center gap-4">
                <h3 id={`month-${month}`} className="text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">{month} <span className="text-slate-400">/ {año}</span></h3>
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{items.length} {items.length === 1 ? 'evento' : 'eventos'}</span>
              </div>
              <div className="space-y-4">
                {items.map((competition) => {
                  const logoUrl = getCompetitionLogo(competition);
                  return (
                    <article key={`${competition.año}-${competition.id}`} className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[128px_176px_1fr]">
                      <div className="flex items-center justify-center border-r border-cyan-300/20 bg-[#0F4C5C] px-4 py-6 text-center text-white md:min-h-44">
                        <div><p className="text-3xl font-bold leading-none tabular-nums">{competition.fechaInicio}{competition.fechaFin !== competition.fechaInicio && <span className="text-xl text-cyan-300">–{competition.fechaFin}</span>}</p><p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-200">{competition.mes.slice(0, 3)}</p></div>
                      </div>
                      <div className="flex min-h-40 items-center justify-center border-b border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800/60 md:border-b-0 md:border-r">
                        {logoUrl ? <img src={logoUrl} alt={competition.logoAlt || `Identidad de ${competition.organizador}`} width="160" height="96" loading="lazy" decoding="async" className="aspect-[5/3] w-full max-w-36 object-contain" /> : <div className="text-center text-slate-500 dark:text-slate-300"><ShieldCheck className="mx-auto text-blue-700 dark:text-cyan-400" size={34} aria-hidden="true" /><p className="mt-2 text-xs font-bold uppercase tracking-wider">{competition.organizador || 'Organizador'}</p></div>}
                      </div>
                      <div className="flex min-w-0 flex-col justify-center p-5 sm:p-7">
                        <div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200"><Waves size={14} aria-hidden="true" /> {DISCIPLINES.find(({ value }) => value === competition.deporte)?.label || 'Deporte acuático'}</span>{competition.reconocido && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><CheckCircle2 size={14} aria-hidden="true" /> Oficial</span>}</div>
                        <h4 className="mt-4 text-xl font-bold leading-tight text-slate-950 dark:text-white sm:text-2xl">{competition.nombre}</h4>
                        <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Organiza: {competition.organizador}</p>
                        <div className="mt-4 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"><MapPin className="mt-0.5 shrink-0 text-blue-700 dark:text-cyan-400" size={17} aria-hidden="true" /><span>{competition.ubicacion}</span></div>
                        <Link to={`/calendario/${competition.slug}`} className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-[#0F4C5C] px-4 text-sm font-bold text-white transition-colors hover:bg-[#0B3D49] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C]">
                          Ver competencia <ArrowRight size={17} aria-hidden="true" />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CompetitionsCalendar;
