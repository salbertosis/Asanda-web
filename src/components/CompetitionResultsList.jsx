import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const sexLabels = { female: 'Femenino', male: 'Masculino', mixed: 'Mixto', open: 'Abierto' };
const roundLabels = { final: 'Final', finals: 'Final', timed_final: 'Final por tiempo', semifinal: 'Semifinal', semifinals: 'Semifinal', heat: 'Clasificación', heats: 'Clasificación', prelim: 'Preliminar', preliminary: 'Preliminar', swim_off: 'Desempate' };
const statusLabels = { disqualified: 'DQ', did_not_start: 'DNS', did_not_finish: 'DNF', no_time: 'Sin tiempo' };
const dateFormatter = new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const formatDay = (value) => dateFormatter.format(new Date(`${value}T00:00:00Z`));
const formatDateRange = ({ startsOn, endsOn }) => endsOn && endsOn !== startsOn
  ? `${formatDay(startsOn)} – ${formatDay(endsOn)}`
  : formatDay(startsOn);
const displaySex = (value) => sexLabels[value?.toLowerCase()] || value || 'Sexo no indicado';
const displayRound = (value) => roundLabels[value?.toLowerCase()] || value || 'Fase no indicada';
const formatTime = (milliseconds) => {
  const totalHundredths = Math.floor(milliseconds / 10);
  const minutes = Math.floor(totalHundredths / 6000);
  const seconds = Math.floor((totalHundredths % 6000) / 100);
  const hundredths = totalHundredths % 100;
  return `${minutes ? `${minutes}:` : ''}${minutes ? String(seconds).padStart(2, '0') : seconds}.${String(hundredths).padStart(2, '0')}`;
};

const DisclosureButton = ({ expanded, controls, onClick, children, className = '' }) => (
  <button
    type="button"
    aria-expanded={expanded}
    aria-controls={controls}
    onClick={onClick}
    className={`flex w-full items-center justify-between gap-4 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-asanda-orange-strong focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${className}`}
  >
    {children}
    <ChevronDown aria-hidden="true" className={`h-5 w-5 shrink-0 motion-safe:transition-transform ${expanded ? 'rotate-180' : ''}`} />
  </button>
);

const ResultsTable = ({ event, phase }) => (
  <div className="max-w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
    <table className="min-w-[680px] w-full border-collapse text-sm" aria-label={`${event.name}, ${displayRound(phase.round)}`}>
      <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <tr>
          {['Posición', 'Carril', 'Nombre', 'Club', 'Marca / estado'].map((heading) => <th key={heading} scope="col" className="px-4 py-3 text-left font-bold">{heading}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 bg-white text-slate-800 dark:divide-slate-700 dark:bg-slate-900 dark:text-slate-100">
        {phase.results.map((result) => (
          <tr key={result.id}>
            <td className="px-4 py-3 font-bold">{result.place ?? '—'}</td>
            <td className="px-4 py-3">{result.lane ?? '—'}</td>
            <th scope="row" className="px-4 py-3 text-left font-semibold">{result.athlete.name}{result.relayMembers?.length ? <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">{result.relayMembers.join(' · ')}</span> : null}</th>
            <td className="px-4 py-3">{result.club.name || 'Sin club indicado'}</td>
            <td className="px-4 py-3 font-mono font-bold text-asanda-blue dark:text-cyan-300">
              {result.status === 'official' ? formatTime(result.timeMs) : statusLabels[result.status]}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const EventGroup = ({ event, competitionIndex, eventIndex }) => {
  const [expanded, setExpanded] = useState(false);
  const [openPhase, setOpenPhase] = useState(null);
  const panelId = `result-event-${competitionIndex}-${eventIndex}`;
  const category = event.categoryName || 'Sin categoría indicada';
  return (
    <li className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <DisclosureButton expanded={expanded} controls={panelId} onClick={() => setExpanded((value) => !value)} className="p-4">
        <span>
          <span className="block font-bold text-slate-900 dark:text-white">{event.name}</span>
          <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">{category} · {displaySex(event.competitiveSex)}</span>
        </span>
      </DisclosureButton>
      {expanded && (
        <div id={panelId} className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-700">
          {event.phases.map((phase, phaseIndex) => {
            const phasePanelId = `${panelId}-phase-${phaseIndex}`;
            const isOpen = openPhase === phase.id;
            return (
              <section key={phase.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                <DisclosureButton expanded={isOpen} controls={phasePanelId} onClick={() => setOpenPhase(isOpen ? null : phase.id)} className="px-2 py-2 font-bold text-slate-800 dark:text-slate-100">
                  <span>{displayRound(phase.round)}</span>
                </DisclosureButton>
                {isOpen && <div id={phasePanelId} className="pt-3"><ResultsTable event={event} phase={phase} /></div>}
              </section>
            );
          })}
        </div>
      )}
    </li>
  );
};

export const CompetitionEvents = ({ competition, competitionIndex }) => <ul className="space-y-3 border-t border-slate-200 bg-slate-50 p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-950">{competition.events.map((event, eventIndex) => <EventGroup key={event.id} event={event} competitionIndex={competitionIndex} eventIndex={eventIndex} />)}</ul>;

const CompetitionResultsList = ({ competitions, renderSnapshot }) => {
  const [openCompetition, setOpenCompetition] = useState(null);
  return (
    <div className="space-y-4">
      {competitions.map((competition, competitionIndex) => {
        const panelId = `result-competition-${competitionIndex}`;
        const expanded = openCompetition === competition.id;
        return (
          <article key={competition.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <DisclosureButton expanded={expanded} controls={panelId} onClick={() => setOpenCompetition(expanded ? null : competition.id)} className="p-5 sm:p-6">
              <span>
                <span className="block text-lg font-extrabold text-slate-950 dark:text-white">{competition.name}</span>
                <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">{formatDateRange(competition)}</span>
              </span>
            </DisclosureButton>
            {expanded && <div id={panelId}>{competition.source === 'snapshot' ? renderSnapshot?.(competition, competitionIndex) : <CompetitionEvents competition={competition} competitionIndex={competitionIndex} />}</div>}
          </article>
        );
      })}
    </div>
  );
};

export default CompetitionResultsList;
