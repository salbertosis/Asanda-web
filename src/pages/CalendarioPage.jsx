import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHero from '../components/PageHero';
import CompetitionsCalendar from '../components/CompetitionsCalendar';
import CompetitionSponsorBadge from '../components/ads/CompetitionSponsorBadge';
import { getPublicCalendarFilters, getPublishedCompetitions } from '../services/competitions';

const validMonth = (value) => value === 'all' || /^(0[1-9]|1[0-2])$/.test(value);
const closestYear = (years) => years.reduce((best, year) => Math.abs(year - new Date().getFullYear()) < Math.abs(best - new Date().getFullYear()) ? year : best, years[0]);

const CalendarioPage = () => {
  const [params, setParams] = useSearchParams();
  const [catalog, setCatalog] = useState(null);
  const [competencias, setCompetencias] = useState([]);
  const [status, setStatus] = useState('loading');
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setCatalog(null);
    setStatus('loading');
    getPublicCalendarFilters(controller.signal).then(setCatalog).catch(() => setStatus('error'));
    return () => controller.abort();
  }, [catalogRetry]);

  const availableYears = catalog?.years || [];
  const defaultYear = availableYears.includes(new Date().getFullYear()) ? new Date().getFullYear() : (availableYears.length ? closestYear(availableYears) : new Date().getFullYear());
  const rawSport = params.get('sport'); const rawYear = Number(params.get('year')); const rawMonth = params.get('month');
  const sport = catalog && (rawSport === 'all' || catalog.disciplines.some((item) => item.code === rawSport)) ? rawSport : 'all';
  const year = availableYears.includes(rawYear) ? rawYear : defaultYear;
  const month = validMonth(rawMonth) ? rawMonth : 'all';

  useEffect(() => {
    if (!catalog) return;
    if (params.size && (rawSport !== sport || rawYear !== year || rawMonth !== month)) setParams({ sport, year: String(year), month }, { replace: true });
  }, [catalog, month, params, rawMonth, rawSport, rawYear, setParams, sport, year]);

  useEffect(() => {
    if (!catalog) return undefined;
    const controller = new AbortController();
    setStatus('loading');
    getPublishedCompetitions({ sportCode: sport, year, month, signal: controller.signal })
      .then((items) => { setCompetencias(items); setStatus('ready'); })
      .catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => controller.abort();
  }, [catalog, month, retry, sport, year]);

  const updateFilters = (next, replace = false) => setParams({ sport, year: String(year), month, ...next }, { replace });
  const reset = () => setParams({}, { replace: false });

  return <div className="min-h-screen overflow-x-clip bg-slate-50 dark:bg-slate-950">
    <PageHero title="Calendario" subtitle="La agenda oficial de competencias acuáticas de Anzoátegui, organizada por fecha, disciplina y sede." compact />
    <div className="container mx-auto px-4 py-4"><CompetitionSponsorBadge /></div>
    {status === 'loading' && <section className="flex min-h-96 items-center justify-center py-10" role="status"><p className="text-lg font-medium text-slate-700 dark:text-slate-200">Cargando calendario…</p></section>}
    {status === 'error' && <section className="px-4 py-10 text-center" role="alert"><div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-6 text-red-800"><p>No pudimos cargar el calendario.</p><button type="button" onClick={() => catalog ? setRetry((value) => value + 1) : setCatalogRetry((value) => value + 1)} className="mt-4 min-h-11 rounded-xl border border-red-700 px-4 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Reintentar</button></div></section>}
    {status === 'ready' && <CompetitionsCalendar competencias={competencias} sports={catalog.disciplines} years={availableYears} filters={{ sport, year, month }} onChange={updateFilters} onReset={reset} />}
  </div>;
};

export default CalendarioPage;
