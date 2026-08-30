import React from 'react';
import { ArrowUpRight, CalendarDays, Medal } from 'lucide-react';

export const formatPerformanceTime = (timeMs) => {
  if (!timeMs) return null;
  const minutes = Math.floor(timeMs / 60000);
  const seconds = ((timeMs % 60000) / 1000).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  return `${minutes ? `${minutes}:` : ''}${minutes && Number(seconds) < 10 ? `0${seconds}` : seconds}`;
};

const FeaturedAthleteCard = ({ athlete, dialogId, onOpen }) => {
  const featuredResults = athlete.results.filter((result, index, results) => (
    results.findIndex((candidate) => candidate.eventName === result.eventName) === index
  )).slice(0, 3);

  return (
    <article className="group relative min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_70px_-40px_rgba(8,47,73,0.75)] dark:border-slate-700 dark:bg-slate-900">
        <div className="relative aspect-[5/4] overflow-hidden bg-slate-100 dark:bg-slate-800 sm:aspect-[16/11]">
          <img src={athlete.photoUrl} alt={athlete.photoAlt} width="720" height="495" loading="lazy" className={`h-full w-full transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none ${athlete.photoUrl === '/asanda.png' ? 'object-contain p-12' : 'object-cover'}`} />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-asanda-deep via-asanda-deep/35 to-transparent" />
           <div className="absolute inset-x-0 bottom-0 min-w-0 p-5 text-white sm:p-7">
             <p className="min-w-0 break-words text-xs font-bold uppercase tracking-[0.18em] text-cyan-200 [overflow-wrap:anywhere]">{athlete.clubName}</p>
             <h2 className="mt-2 min-w-0 break-words text-3xl font-black tracking-tight [overflow-wrap:anywhere] sm:text-4xl">{athlete.name}</h2>
             {athlete.name !== athlete.fullName && <p className="mt-1 min-w-0 break-words text-sm text-slate-200 [overflow-wrap:anywhere]">{athlete.fullName}</p>}
          </div>
        </div>
        <div className="border-t-4 border-asanda-orange p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
             <span className="inline-flex min-w-0 items-center gap-2 break-words [overflow-wrap:anywhere]"><CalendarDays size={17} className="shrink-0 text-blue-700 dark:text-cyan-400" aria-hidden="true" />{athlete.category}</span>
            <span className="inline-flex items-center gap-2"><Medal size={17} className="text-asanda-orange" aria-hidden="true" />{athlete.results.length} {athlete.results.length === 1 ? 'resultado oficial publicado' : 'resultados oficiales publicados'}</span>
          </div>
          {featuredResults.length > 0 ? (
            <ul aria-label="Pruebas destacadas" className="mt-5 flex flex-wrap gap-2">
              {featuredResults.map((result) => (
                 <li key={result.eventName} className="max-w-full break-words rounded-full border border-cyan-800/20 bg-cyan-50 px-3 py-2 text-sm font-bold text-asanda-deep [overflow-wrap:anywhere] dark:border-cyan-400/25 dark:bg-cyan-950 dark:text-cyan-100">
                  {result.eventName}{formatPerformanceTime(result.timeMs) && <span className="ml-2 tabular-nums text-blue-700 dark:text-cyan-300">{formatPerformanceTime(result.timeMs)}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">Sin resultados oficiales publicados en este perfil.</p>
          )}
          <span className="mt-6 inline-flex min-h-11 items-center gap-2 font-bold text-blue-700 dark:text-cyan-300">Ver perfil público <ArrowUpRight size={19} aria-hidden="true" /></span>
        </div>
      <button type="button" aria-label={`Ver perfil público de ${athlete.name}`} aria-haspopup="dialog" aria-controls={dialogId} onClick={onOpen} className="absolute inset-0 z-10 rounded-[1.75rem] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-asanda-orange" />
    </article>
  );
};

export default FeaturedAthleteCard;
