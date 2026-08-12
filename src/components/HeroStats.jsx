import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Award, Building2, Users, Waves } from 'lucide-react';

const initialStats = {
  preinfantAthletes: null,
  associatedAthletes: null,
  federatedAthletes: null,
  clubs: null,
};

const HeroStats = () => {
  const [stats, setStats] = useState(initialStats);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    import('../services/homepageStats')
      .then(({ getHomepageStats }) => getHomepageStats(controller.signal))
      .then((result) => {
        if (!active) return;
        setStats(result);
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

  const cards = [
    { value: stats.preinfantAthletes, label: 'Atletas preinfantiles', icon: Waves, href: '/atletas-asociados', accent: 'text-cyan-200' },
    { value: stats.associatedAthletes, label: 'Atletas asociados', icon: Users, href: '/atletas-asociados', accent: 'text-emerald-200' },
    { value: stats.federatedAthletes, label: 'Atletas federados', icon: Award, href: '/atletas-federados', accent: 'text-amber-200' },
    { value: stats.clubs, label: 'Clubes activos', icon: Building2, href: '/clubes', accent: 'text-blue-200' },
  ];

  return (
    <div className="border-x border-t border-white/15 bg-asanda-ink/75 backdrop-blur-xl" aria-busy={status === 'loading'} aria-label="Estadísticas principales">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200/80 sm:px-6">
        <span>Cifras oficiales vigentes</span>
        <span className="hidden sm:inline">Fuente: registro ASANDA</span>
      </div>
      <div className="grid gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ value, label, icon: Icon, href, accent }) => (
          <Link
            key={label}
            to={href}
            aria-label={value === null ? `${label}: no disponible` : `${value} ${label.toLowerCase()}`}
            className="group relative flex min-h-28 min-w-0 items-center gap-4 overflow-hidden bg-asanda-ink/85 px-5 py-5 text-white transition-colors hover:bg-asanda-navy/95 lg:min-h-32 lg:px-6"
          >
            <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl border border-current/30 bg-white/5 ${accent}`}>
              <Icon size={22} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <strong className="font-display block min-w-10 text-3xl leading-none tracking-wide tabular-nums lg:text-4xl">{value ?? '—'}</strong>
              <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.13em] text-blue-100 group-hover:text-white sm:text-[11px]">
                {label}
              </span>
            </span>
            <ArrowUpRight className="absolute right-4 top-4 text-white/35 transition-colors group-hover:text-cyan-200" size={17} aria-hidden="true" />
          </Link>
        ))}
      </div>
      {status !== 'ready' && (
        <p className="border-t border-white/10 px-5 py-2 text-center text-xs text-blue-100" role="status">
          {status === 'loading' ? 'Cargando estadísticas…' : 'Estadísticas no disponibles en este momento.'}
        </p>
      )}
    </div>
  );
};

export default HeroStats;
