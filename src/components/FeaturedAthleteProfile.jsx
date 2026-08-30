import React from 'react';
import { CalendarDays, Flag, Medal, Timer, Trophy } from 'lucide-react';
import { formatPerformanceTime } from './FeaturedAthleteCard';

const DATE_FORMATTER = new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const PLACE_LABELS = { 1: 'Campeón nacional', 2: 'Subcampeón nacional', 3: 'Bronce nacional' };
const MEDAL_LABELS = { gold: 'Oro', silver: 'Plata', bronze: 'Bronce' };

const formatDate = (value) => value ? DATE_FORMATTER.format(new Date(`${value}T00:00:00Z`)) : null;

const AchievementList = ({ achievements, empty }) => achievements.length > 0 ? (
  <ul className="mt-4 space-y-3">
    {achievements.map((achievement, index) => (
      <li key={`${achievement.title}-${achievement.achievedOn || achievement.validFrom}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="min-w-0 break-words font-bold text-slate-950 [overflow-wrap:anywhere] dark:text-white">{achievement.title}</p>
        {achievement.competitionName && <p className="mt-1 min-w-0 break-words text-sm text-slate-700 [overflow-wrap:anywhere] dark:text-slate-200">{achievement.competitionName}</p>}
        <p className="mt-2 text-sm font-semibold text-blue-700 dark:text-cyan-300">
          {achievement.type === 'national_podium' && PLACE_LABELS[achievement.place]}
          {achievement.type === 'international_medal' && `Medalla de ${MEDAL_LABELS[achievement.medal]}`}
          {achievement.type === 'national_team' && `Vigencia: ${formatDate(achievement.validFrom)}${achievement.validTo ? ` al ${formatDate(achievement.validTo)}` : ' en adelante'}`}
          {achievement.achievedOn && ` · ${formatDate(achievement.achievedOn)}`}
        </p>
      </li>
    ))}
  </ul>
) : <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{empty}</p>;

const FeaturedAthleteProfile = ({ athlete }) => {
  const nationalPodiums = athlete.achievements.filter(({ type }) => type === 'national_podium');
  const internationalMedals = athlete.achievements.filter(({ type }) => type === 'international_medal');
  const nationalTeams = athlete.achievements.filter(({ type }) => type === 'national_team');

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

        <section aria-labelledby={`${athlete.profileKey}-national-podiums`}>
          <h3 id={`${athlete.profileKey}-national-podiums`} className="flex items-center gap-2 text-xl font-black text-slate-950 dark:text-white"><Trophy className="text-asanda-orange" aria-hidden="true" />Podios nacionales</h3>
          <AchievementList achievements={nationalPodiums} empty="No hay podios nacionales editoriales publicados." />
        </section>

        <section aria-labelledby={`${athlete.profileKey}-international-medals`}>
          <h3 id={`${athlete.profileKey}-international-medals`} className="flex items-center gap-2 text-xl font-black text-slate-950 dark:text-white"><Medal className="text-asanda-orange" aria-hidden="true" />Medallas internacionales</h3>
          <AchievementList achievements={internationalMedals} empty="No hay medallas internacionales editoriales publicadas." />
        </section>

        <section aria-labelledby={`${athlete.profileKey}-national-team`} className="lg:col-span-2">
          <h3 id={`${athlete.profileKey}-national-team`} className="flex items-center gap-2 text-xl font-black text-slate-950 dark:text-white"><Flag className="text-blue-700 dark:text-cyan-300" aria-hidden="true" />Selección Nacional</h3>
          <AchievementList achievements={nationalTeams} empty="No hay convocatorias editoriales publicadas para la Selección Nacional." />
        </section>
      </div>
    </div>
  );
};

export default FeaturedAthleteProfile;
