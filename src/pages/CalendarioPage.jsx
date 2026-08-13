import React, { useEffect, useMemo, useState } from 'react';
import PageHero from '../components/PageHero';
import CompetitionsCalendar from '../components/CompetitionsCalendar';
import CompetitionSponsorBadge from '../components/ads/CompetitionSponsorBadge';
import { getPublishedCompetitions } from '../services/competitions';

const CalendarioPage = () => {
  const [año, setAño] = useState(2026);
  const [competencias, setCompetencias] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    getPublishedCompetitions(controller.signal)
      .then((publishedCompetitions) => {
        if (!active) return;
        setCompetencias(publishedCompetitions);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const competenciasDelAño = useMemo(
    () => competencias.filter((competencia) => competencia.año === año),
    [competencias, año]
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHero
        title="Calendario"
        subtitle="La agenda oficial de competencias acuáticas de Anzoátegui, organizada por fecha, disciplina y sede."
        compact
      />

      {/* Patrocinador de competencias: inventario rotatorio global */}
      <div className="container mx-auto px-4 py-4">
        <CompetitionSponsorBadge />
      </div>

      {status === 'loading' && (
        <section className="flex min-h-96 items-center justify-center bg-slate-50 py-10 dark:bg-slate-950 md:py-14" role="status">
          <p className="text-lg font-medium text-slate-700 dark:text-slate-200">Cargando calendario…</p>
        </section>
      )}

      {status === 'error' && (
        <section className="bg-slate-50 py-10 dark:bg-slate-950 md:py-14" role="alert">
          <div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-800">
            No pudimos cargar el calendario. Intentá nuevamente más tarde.
          </div>
        </section>
      )}

      {status === 'ready' && (
        <CompetitionsCalendar
          competencias={competenciasDelAño}
          año={año}
          onAñoChange={setAño}
        />
      )}
    </div>
  );
};

export default CalendarioPage;