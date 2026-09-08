import React from 'react';
import { CalendarDays, MapPin, Timer, Trophy } from 'lucide-react';
import { formatPerformanceTime } from './FeaturedAthleteCard';
import { formatStateRecordTime } from '../services/stateRecords';

const DATE_FORMATTER = new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const TYPE_LABELS = { national_podium: 'Podio nacional', international_podium: 'Podio internacional', international_participation: 'Participación internacional', state_record: 'Récord estatal' };
const PLACE_LABELS = { 1: 'Primer lugar', 2: 'Segundo lugar', 3: 'Tercer lugar' };
const OUTCOME_LABELS = { top_8: 'Top 8', outstanding_participation: 'Participación destacada' };

const formatDate = (value) => value ? DATE_FORMATTER.format(new Date(`${value}T00:00:00Z`)) : null;

const AchievementChild = ({ child }) => <li className="min-w-0 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
  <p className="break-words font-bold text-slate-950 [overflow-wrap:anywhere] dark:text-white">{child.eventName}</p>
  {child.podiumPlace && <p className="mt-1 text-sm font-semibold text-blue-700 dark:text-cyan-300">{PLACE_LABELS[child.podiumPlace]}</p>}
  {child.participationOutcome && <p className="mt-1 text-sm font-semibold text-blue-700 dark:text-cyan-300">{OUTCOME_LABELS[child.participationOutcome]}</p>}
  {child.record && <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1 text-sm text-slate-700 dark:text-slate-200"><dt className="font-semibold">Marca</dt><dd className="font-bold tabular-nums">{formatStateRecordTime(child.record.timeMs)}</dd><dt className="font-semibold">Categoría</dt><dd className="break-words">{child.record.categoryName}</dd><dt className="font-semibold">Registro</dt><dd className="break-words">{child.record.competitionName} · {child.record.achievedYear}</dd></dl>}
</li>;

const AchievementGroups = ({ achievements }) => achievements.length > 0 ? <ol className="mt-4 space-y-4">
  {achievements.map((group, index) => <li key={`${group.title}-${group.achievedOn}-${index}`}>
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-cyan-300">{TYPE_LABELS[group.type]}</p>
      <h4 className="mt-1 break-words text-lg font-black text-slate-950 [overflow-wrap:anywhere] dark:text-white">{group.title}</h4>
      <dl className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-3"><div><dt className="font-semibold">Competencia</dt><dd className="break-words">{group.competitionName}</dd></div><div><dt className="flex items-center gap-1 font-semibold"><MapPin size={15} aria-hidden="true" />Lugar</dt><dd className="break-words">{group.location}</dd></div><div><dt className="font-semibold">Fecha</dt><dd>{formatDate(group.achievedOn)}</dd></div></dl>
      <ul aria-label={`Resultados de ${group.title}`} className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2">{group.children.map((child, childIndex) => <AchievementChild key={`${child.eventName}-${childIndex}`} child={child} />)}</ul>
    </article>
  </li>)}
</ol> : <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">No hay logros competitivos publicados.</p>;

const FeaturedAthleteProfile = ({ athlete }) => {
  return (
    <div className="min-w-0">
      <section aria-labelledby={`${athlete.profileKey}-public-profile`} className="grid gap-5 border-b border-slate-200 p-5 dark:border-slate-700 sm:grid-cols-[10rem_minmax(0,1fr)] sm:p-7">
        <img src={athlete.photoUrl} alt={athlete.photoAlt} width="320" height="320" className={`aspect-square w-full max-w-40 rounded-2xl bg-slate-100 ${athlete.photoUrl === '/asanda.png' ? 'object-contain p-5' : 'object-cover'} dark:bg-slate-800`} />
        <div className="min-w-0 self-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-cyan-300">Perfil competitivo público</p>
          <h2 id={`${athlete.profileKey}-public-profile`} className="mt-2 min-w-0 break-words text-3xl font-black tracking-tight text-slate-950 [overflow-wrap:anywhere] dark:text-white">{athlete.fullName}</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="min-w-0"><dt className="font-semibold text-slate-500 dark:text-slate-400">Club</dt><dd className="mt-1 break-words font-bold text-slate-900 [overflow-wrap:anywhere] dark:text-white">{athlete.clubName}</dd></div>
            <div className="min-w-0"><dt className="font-semibold text-slate-500 dark:text-slate-400">Categoría</dt><dd className="mt-1 break-words font-bold text-slate-900 [overflow-wrap:anywhere] dark:text-white">{athlete.category}</dd></div>
          </dl>
        </div>
      </section>

      <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-2">
        <section aria-labelledby={`${athlete.profileKey}-events`}>
          <h3 id={`${athlete.profileKey}-events`} className="flex items-center gap-2 text-xl font-black text-slate-950 dark:text-white"><Timer className="text-blue-700 dark:text-cyan-300" aria-hidden="true" />Pruebas con resultados oficiales publicados</h3>
          {athlete.events.length > 0 ? <ul className="mt-4 flex min-w-0 flex-wrap gap-2">{athlete.events.map((event) => <li key={event} className="max-w-full break-words rounded-full bg-cyan-50 px-3 py-2 text-sm font-bold text-asanda-deep [overflow-wrap:anywhere] dark:bg-cyan-950 dark:text-cyan-100">{event}</li>)}</ul> : <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">No hay pruebas con resultados oficiales publicados.</p>}
        </section>

        <section aria-labelledby={`${athlete.profileKey}-results`}>
          <h3 id={`${athlete.profileKey}-results`} className="flex items-center gap-2 text-xl font-black text-slate-950 dark:text-white"><CalendarDays className="text-asanda-orange" aria-hidden="true" />Resultados oficiales recientes</h3>
          {athlete.results.length > 0 ? <ol className="mt-4 min-w-0 space-y-3">{athlete.results.map((result, index) => <li key={`${result.eventName}-${result.competitionDate}-${index}`} className="min-w-0 rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex min-w-0 flex-wrap items-start justify-between gap-2"><p className="min-w-0 break-words font-bold text-slate-950 [overflow-wrap:anywhere] dark:text-white">{result.eventName}</p>{result.timeMs && <strong className="shrink-0 tabular-nums text-blue-700 dark:text-cyan-300">{formatPerformanceTime(result.timeMs)}</strong>}</div><p className="mt-2 min-w-0 break-words text-sm text-slate-700 [overflow-wrap:anywhere] dark:text-slate-200">{result.competitionName}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{result.place && `Puesto ${result.place} · `}{formatDate(result.competitionDate)}</p></li>)}</ol> : <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">No hay resultados oficiales recientes publicados.</p>}
        </section>

        <section aria-labelledby={`${athlete.profileKey}-achievements`} className="lg:col-span-2">
          <h3 id={`${athlete.profileKey}-achievements`} className="flex items-center gap-2 text-xl font-black text-slate-950 dark:text-white"><Trophy className="text-asanda-orange" aria-hidden="true" />Logros competitivos</h3>
          <AchievementGroups achievements={athlete.achievements} />
        </section>
      </div>
    </div>
  );
};

export default FeaturedAthleteProfile;
