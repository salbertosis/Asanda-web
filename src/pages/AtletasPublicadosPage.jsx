import React from 'react';
import { UsersRound } from 'lucide-react';
import AthleteDirectory from '../components/AthleteDirectory';

const AtletasPublicadosPage = () => (
  <div className="min-h-screen overflow-x-hidden bg-slate-50 dark:bg-slate-950">
    <header data-testid="athlete-directory-hero" className="relative isolate overflow-hidden bg-gradient-to-br from-asanda-deep via-slate-900 to-cyan-950 text-white">
      <div aria-hidden="true" className="absolute -right-14 -top-24 h-52 w-52 rounded-full border-[30px] border-cyan-400/10" />
      <div aria-hidden="true" className="absolute bottom-0 right-[16%] h-px w-44 -rotate-[18deg] bg-gradient-to-r from-transparent via-asanda-orange/70 to-transparent" />
      <div className="relative mx-auto flex max-w-7xl items-center gap-4 px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-cyan-200 shadow-lg shadow-black/10">
          <UsersRound aria-hidden="true" className="h-6 w-6" />
        </div>
        <div className="min-w-0 border-l-2 border-asanda-orange pl-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Directorio institucional</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Atletas</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-5 text-slate-200 sm:text-base sm:leading-6">Perfiles públicos de atletas registrados por ASANDA.</p>
        </div>
      </div>
    </header>
    <section className="py-6 md:py-8" aria-label="Directorio de atletas publicados">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AthleteDirectory />
      </div>
    </section>
  </div>
);

export default AtletasPublicadosPage;
