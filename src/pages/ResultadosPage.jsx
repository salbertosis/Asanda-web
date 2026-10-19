import React from 'react';
import PublicCompetitionResults from '../components/PublicCompetitionResults';
import CompetitionSponsorBadge from '../components/ads/CompetitionSponsorBadge';

const ResultadosPage = () => (
  <div id="resultados-page" className="min-h-screen overflow-x-hidden bg-white dark:bg-slate-950">
    <header className="relative isolate overflow-hidden bg-asanda-blue px-4 py-16 text-white sm:py-20">
      <img src="/assets/hero.svg" alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-950/95 to-asanda-blue/80" />
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-cyan-200">Asociación de Deportes Acuáticos del Estado Anzoátegui</p>
        <h1 className="mt-3 text-4xl font-black sm:text-6xl">Resultados ASANDA</h1>
        <p className="mt-4 max-w-2xl text-lg text-blue-100">Marcas y estados finales de las competencias publicadas por ASANDA.</p>
      </div>
    </header>

    <div className="mx-auto max-w-6xl px-4 pt-6">
      <CompetitionSponsorBadge />
    </div>

    <PublicCompetitionResults />
  </div>
);

export default ResultadosPage;
