import React, { useEffect, useState } from 'react';
import { CalendarDays, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUpcomingCompetitions } from '../services/competitions';

const formatDate = (isoDay) => new Intl.DateTimeFormat('es-VE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date(`${isoDay}T12:00:00`));

const formatDateRange = ({ startsOn, endsOn }) => (
  endsOn && endsOn !== startsOn
    ? `${formatDate(startsOn)} al ${formatDate(endsOn)}`
    : formatDate(startsOn)
);

const UpcomingEvents = () => {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    getUpcomingCompetitions({ limit: 3, signal: controller.signal })
      .then((upcomingEvents) => {
        if (!active) return;
        setEvents(upcomingEvents);
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

  if (status === 'error' || (status === 'ready' && events.length === 0)) return null;

  return (
    <section className="mt-10 border-t border-slate-200 pt-8" aria-labelledby="upcoming-events-title" data-testid="upcoming-events">
      <h2 id="upcoming-events-title" className="text-2xl font-bold text-slate-950">Próximos eventos</h2>
      {status === 'loading' ? (
        <div className="mt-5 grid min-h-32 gap-3 sm:grid-cols-3" role="status" aria-label="Cargando próximos eventos" aria-busy="true">
          {[1, 2, 3].map((item) => <div key={item} className="min-h-32 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none" aria-hidden="true" />)}
        </div>
      ) : (
        <ul className="mt-5 grid min-w-0 gap-3 sm:grid-cols-3">
          {events.map((event) => (
            <li key={event.id} className="min-w-0">
              <Link to={`/calendario/${event.slug}`} className="flex min-h-32 h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 text-slate-950 transition-colors hover:border-[#0F4C5C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F4C5C]">
                <span className="font-bold leading-snug">{event.nombre}</span>
                <span className="mt-3 flex items-start gap-2 text-sm text-slate-600"><CalendarDays className="mt-0.5 shrink-0" size={16} aria-hidden="true" /><time dateTime={event.startsOn}>{formatDateRange(event)}</time></span>
                {event.sede && <span className="mt-2 flex items-start gap-2 text-sm text-slate-600"><MapPin className="mt-0.5 shrink-0" size={16} aria-hidden="true" /><span className="min-w-0 break-words">{event.sede}</span></span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default UpcomingEvents;
