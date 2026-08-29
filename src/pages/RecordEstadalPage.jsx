import React from 'react';
import { TimerReset } from 'lucide-react';
import RecordEstadal from '../components/RecordEstadal';

const RecordEstadalPage = () => {
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 dark:bg-slate-950">
      <header data-testid="state-records-hero" className="relative isolate overflow-hidden bg-gradient-to-br from-asanda-deep via-slate-900 to-cyan-950 text-white">
        <div aria-hidden="true" className="absolute -right-16 -top-24 h-56 w-56 rounded-full border-[32px] border-cyan-400/10" />
        <div aria-hidden="true" className="absolute bottom-0 right-[18%] h-px w-48 rotate-[-18deg] bg-gradient-to-r from-transparent via-asanda-orange/70 to-transparent" />
        <div className="relative mx-auto flex max-w-7xl items-center gap-4 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-cyan-200 shadow-lg shadow-black/10">
            <TimerReset aria-hidden="true" className="h-6 w-6" />
          </div>
          <div className="min-w-0 border-l-2 border-asanda-orange pl-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Natación · Anzoátegui</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Récord Estadal</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">Marcas oficiales avaladas por FEVEDA y ASANDA.</p>
          </div>
        </div>
      </header>
      <RecordEstadal />
    </div>
  );
};

export default RecordEstadalPage;


