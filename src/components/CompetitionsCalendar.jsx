import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, ChevronDown, MapPin, RefreshCw, ShieldCheck, Waves } from 'lucide-react';
import { getCloudinaryUrl } from '../config/cloudinary';
import CompetitionSponsorBadge from './ads/CompetitionSponsorBadge';

const MONTHS = ['Todos', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTH_VALUES = ['all', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

const getCompetitionLogo = (competition) => {
  if (competition.logoUrl) return competition.logoUrl;
  return competition.logoPublicId
    ? getCloudinaryUrl(competition.logoPublicId, { width: 320, height: 192, crop: 'pad', background: 'transparent' })
    : null;
};

const CompetitionsCalendar = ({ competencias, sports, years, filters, onChange, onReset }) => {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const { sport, year, month } = filters;
  const groupedCompetitions = MONTHS.slice(1).flatMap((monthName) => {
    const items = competencias.filter((competition) => competition.mes === monthName);
    return items.length > 0 ? [{ month: monthName, items }] : [];
  });
  const href = (sportCode) => `?sport=${sportCode}&year=${year}&month=${month}`;
  const selectedSportName = sport === 'all' ? 'Todas las disciplinas' : sports.find((item) => item.code === sport)?.name;
  const selectedMonthName = month === 'all' ? 'Todos los meses' : MONTHS[MONTH_VALUES.indexOf(month)];
  const resultLabel = `${competencias.length} ${competencias.length === 1 ? 'competencia' : 'competencias'} · ${selectedSportName} · ${selectedMonthName}`;

  return (
    <section id="calendario" className="bg-slate-50 py-4 dark:bg-slate-950 sm:py-6 lg:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-5">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_-42px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900" aria-labelledby="calendar-title">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#082f49] via-[#0b4656] to-[#0f5f66] p-4 text-white sm:p-5 lg:p-6">
            <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full border border-white/10" aria-hidden="true" />
            <div className="pointer-events-none absolute right-16 top-8 h-16 w-16 rotate-45 border border-cyan-200/10" aria-hidden="true" />
            <div className="relative grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 shadow-inner sm:h-12 sm:w-12">
                  <CalendarDays size={24} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Agenda oficial ASANDA</p>
                  <h1 id="calendar-title" className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Calendario de competiciones</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-5 text-slate-200">Consultá competencias, fechas, sedes y disciplinas de la temporada oficial.</p>
                </div>
              </div>
              <div className="flex items-end justify-between gap-3 md:block">
                <p className="pb-2 text-sm font-bold text-cyan-100 md:text-right">Temporada {year}</p>
                <label className="block text-xs font-bold uppercase tracking-wider text-cyan-100">
                  Año
                  <select value={year} onChange={(event) => onChange({ year: event.target.value })} className="mt-1 block min-h-11 rounded-xl border border-white/30 bg-slate-950/35 px-3 text-sm font-bold text-white focus:border-white focus:outline-none focus:ring-2 focus:ring-cyan-200">
                    {years.map((value) => <option key={value} className="text-slate-950">{value}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex flex-col gap-3 border-t border-white/15 pt-3 sm:flex-row sm:items-center sm:justify-between md:col-span-2">
                <p data-testid="calendar-result-context" aria-live="polite" className="text-sm font-semibold text-slate-100">{resultLabel}</p>
                <button type="button" aria-expanded={filtersExpanded} aria-controls="calendar-secondary-filters" onClick={() => setFiltersExpanded((expanded) => !expanded)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 md:hidden">
                  Filtros <ChevronDown size={18} aria-hidden="true" className={`motion-safe:transition-transform ${filtersExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 dark:bg-slate-900 sm:p-5 lg:p-6">
            <div id="calendar-secondary-filters" className={`${filtersExpanded ? 'grid' : 'hidden'} gap-4 md:grid md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-end`}>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Mes</span>
                <select value={month} onChange={(event) => onChange({ month: event.target.value })} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-900">
                  {MONTHS.map((label, index) => <option key={label} value={MONTH_VALUES[index]}>{index ? label : 'Todos los meses'}</option>)}
                </select>
              </label>
              <nav aria-label="Filtrar calendario por deporte" className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950">
                <div className="flex max-w-full gap-1 overflow-x-auto">
                  {[{ code: 'all', name: 'Todos' }, ...sports].map((item) => {
                    const active = sport === item.code;
                    return <Link key={item.code} to={href(item.code)} aria-current={active ? 'page' : undefined} className={`inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-bold motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${active ? 'bg-[#0F4C5C] text-white shadow-sm dark:bg-cyan-700' : 'text-slate-600 hover:bg-white hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-cyan-300'}`}>{item.name}</Link>;
                  })}
                </div>
              </nav>
              <button type="button" onClick={onReset} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:text-slate-200 dark:hover:text-cyan-300">
                <RefreshCw size={17} aria-hidden="true" /> Reiniciar
              </button>
            </div>
          </div>

          <div>
            <CompetitionSponsorBadge compact />
          </div>
        </section>

        <div className="mt-4 space-y-8 lg:mt-6">
          {groupedCompetitions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900" role="status">
              <CalendarDays className="mx-auto text-blue-700 dark:text-cyan-400" size={34} aria-hidden="true" />
              <h2 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">Sin competencias para estos filtros</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">Probá otro mes, disciplina o año para consultar el resto de la agenda.</p>
            </div>
          ) : groupedCompetitions.map(({ month: monthName, items }) => (
            <section key={monthName} aria-labelledby={`month-${monthName}`}>
              <div className="mb-3 flex items-center gap-3">
                <h2 id={`month-${monthName}`} className="text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">{monthName} <span className="text-slate-400">/ {year}</span></h2>
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{items.length} {items.length === 1 ? 'evento' : 'eventos'}</span>
              </div>
              <div data-testid="month-events-grid" className="grid gap-3 lg:grid-cols-2 lg:items-stretch">
                {items.map((competition) => {
                  const logoUrl = getCompetitionLogo(competition);
                  return (
                    <article key={`${competition.año}-${competition.id}`} className="grid min-w-0 grid-cols-[68px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_40px_-34px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[72px_minmax(0,1fr)]">
                      <div className="flex min-h-full items-center justify-center bg-[#0F4C5C] px-2 py-3 text-center text-white">
                        <div><p className="whitespace-nowrap text-xl font-bold leading-none tabular-nums">{competition.fechaInicio}{competition.fechaFin !== competition.fechaInicio && <span className="text-sm text-cyan-300">–{competition.fechaFin}</span>}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-200">{competition.mes.slice(0, 3)}</p></div>
                      </div>
                      <div className="flex min-w-0 flex-col p-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md bg-slate-50 p-1 dark:bg-slate-800">
                            {logoUrl ? <img src={logoUrl} alt={competition.logoAlt || `Identidad de ${competition.organizador}`} width="84" height="50" loading="lazy" decoding="async" className="h-full w-full object-contain" /> : <div role="img" aria-label={`Identidad de ${competition.organizador || 'Organizador'}`}><ShieldCheck className="text-blue-700 dark:text-cyan-400" size={22} aria-hidden="true" /></div>}
                          </div>
                          <div className="flex min-w-0 flex-wrap gap-1"><span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200"><Waves size={12} aria-hidden="true" /> {competition.sport.name}</span>{competition.reconocido && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><CheckCircle2 size={12} aria-hidden="true" /> Oficial</span>}</div>
                        </div>
                        <h3 className="mt-2 text-base font-bold leading-tight text-slate-950 dark:text-white sm:text-lg">{competition.nombre}</h3>
                        <div data-testid="venue-detail-row" className="mt-auto flex min-w-0 items-center gap-2 pt-1.5">
                          <div className="flex min-w-0 flex-1 items-center gap-1.5 text-xs leading-5 text-slate-600 dark:text-slate-300"><MapPin className="shrink-0 text-blue-700 dark:text-cyan-400" size={14} aria-hidden="true" /><span className="truncate" title={competition.ubicacion}>{competition.ubicacion}</span></div>
                          <Link to={`/calendario/${competition.slug}`} state={{ calendarSearch: href(sport) }} className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded px-0.5 text-sm font-bold text-blue-700 underline decoration-2 underline-offset-4 transition-colors hover:text-asanda-orange-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-cyan-300 dark:hover:text-orange-300">
                            Ver detalle <ArrowRight size={14} aria-hidden="true" />
                          </Link>
                        </div>
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
