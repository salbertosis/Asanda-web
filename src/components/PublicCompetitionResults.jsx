import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import CompetitionResultsList from './CompetitionResultsList.jsx';
import ImportedCompetitionResults from './ImportedCompetitionResults.jsx';
import { getPublicCompetitionResults, getPublicImportedCompetitions, groupPublicCompetitionResults } from '../services/results.js';

const monthFormatter = new Intl.DateTimeFormat('es-VE', { month: 'long', timeZone: 'UTC' });
const monthName = (month) => {
  const label = monthFormatter.format(new Date(Date.UTC(2020, month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const PublicCompetitionResults = () => {
  const [legacyRows, setLegacyRows] = useState([]);
  const [importedCompetitions, setImportedCompetitions] = useState([]);
  const [status, setStatus] = useState('loading');
  const [reload, setReload] = useState(0);
  const [year, setYear] = useState('all');
  const [month, setMonth] = useState('all');

  useEffect(() => {
    const controller = new AbortController(); let active = true;
    setStatus('loading');
    Promise.all([
      getPublicCompetitionResults(null, controller.signal),
      getPublicImportedCompetitions(controller.signal),
    ]).then(([nextLegacyRows, nextImportedCompetitions]) => {
      if (!active) return;
      setLegacyRows(nextLegacyRows); setImportedCompetitions(nextImportedCompetitions); setStatus('ready');
    }).catch((error) => { if (active && error?.name !== 'AbortError') setStatus('error'); });
    return () => { active = false; controller.abort(); };
  }, [reload]);

  const allCompetitions = useMemo(() => [
    ...groupPublicCompetitionResults(legacyRows),
    ...importedCompetitions,
  ].sort((left, right) => right.startsOn.localeCompare(left.startsOn) || left.name.localeCompare(right.name, 'es') || left.id.localeCompare(right.id)), [legacyRows, importedCompetitions]);
  const years = useMemo(() => [...new Set(allCompetitions.map((competition) => competition.startsOn.slice(0, 4)))].sort((left, right) => right.localeCompare(left)), [allCompetitions]);
  const months = useMemo(() => [...new Set(allCompetitions.map((competition) => Number(competition.startsOn.slice(5, 7))))].sort((left, right) => left - right), [allCompetitions]);
  const competitions = useMemo(() => allCompetitions.filter((competition) => {
    const [competitionYear, competitionMonth] = competition.startsOn.split('-');
    return (year === 'all' || competitionYear === year) && (month === 'all' || Number(competitionMonth) === Number(month));
  }), [allCompetitions, year, month]);
  const clearFilters = () => { setYear('all'); setMonth('all'); };

  if (status === 'loading') return <div role="status" className="mx-auto max-w-6xl px-4 py-16 text-center text-slate-600 dark:text-slate-300">Cargando resultados públicos…</div>;
  if (status === 'error') return <div role="alert" className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-800 dark:text-slate-100"><p className="font-bold">No pudimos cargar los resultados públicos.</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Alguna de las consultas públicas no está disponible en este momento.</p><button type="button" onClick={() => setReload((value) => value + 1)} className="mt-5 inline-flex items-center gap-2 rounded-md bg-asanda-blue px-4 py-3 font-bold text-white outline-none hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-asanda-orange-strong focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"><RefreshCw aria-hidden="true" className="h-4 w-4" /> Reintentar</button></div>;
  if (!allCompetitions.length) return <div role="status" className="mx-auto max-w-6xl px-4 py-16 text-center text-slate-600 dark:text-slate-300">Todavía no hay resultados públicos disponibles.</div>;

  return <section aria-labelledby="public-results-heading" className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><h2 id="public-results-heading" className="text-2xl font-extrabold text-slate-950 dark:text-white sm:text-3xl">Competencias publicadas</h2><p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">Seleccioná una competencia, una prueba y la fase disponible para consultar sus resultados finales.</p></div>
      <div className="flex flex-wrap items-end gap-3"><label className="text-sm font-bold text-slate-700 dark:text-slate-200">Año<select value={year} onChange={(event) => setYear(event.target.value)} className="mt-1 block min-h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-asanda-orange-strong dark:border-slate-600 dark:bg-slate-900 dark:text-white"><option value="all">Todos</option>{years.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Mes<select value={month} onChange={(event) => setMonth(event.target.value)} className="mt-1 block min-h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-asanda-orange-strong dark:border-slate-600 dark:bg-slate-900 dark:text-white"><option value="all">Todos</option>{months.map((value) => <option key={value} value={value}>{monthName(value)}</option>)}</select></label>
        <button type="button" onClick={clearFilters} className="min-h-11 rounded-md border border-slate-300 px-4 font-bold text-slate-700 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-asanda-orange-strong dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800">Limpiar filtros</button></div>
    </div>
    {competitions.length ? <CompetitionResultsList competitions={competitions} renderSnapshot={(competition, index) => <ImportedCompetitionResults competition={competition} competitionIndex={index} />} /> : <p role="status" className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300">No hay resultados para los filtros seleccionados.</p>}
  </section>;
};

export default PublicCompetitionResults;
