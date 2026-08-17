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
    { value: stats.preinfantAthletes, label: 'Atletas preinfantiles', icon: Waves, href: '/atletas-asociados', accent: 'text-asanda-cyan', edge: 'border-t-asanda-cyan', chip: 'bg-cyan-50' },
    { value: stats.associatedAthletes, label: 'Atletas asociados', icon: Users, href: '/atletas-asociados', accent: 'text-asanda-aqua', edge: 'border-t-asanda-aqua', chip: 'bg-emerald-50' },
    { value: stats.federatedAthletes, label: 'Atletas federados', icon: Award, href: '/atletas-federados', accent: 'text-asanda-lime', edge: 'border-t-asanda-lime', chip: 'bg-lime-50' },
    { value: stats.clubs, label: 'Clubes activos', icon: Building2, href: '/clubes', accent: 'text-asanda-orange', edge: 'border-t-asanda-orange', chip: 'bg-orange-50' },
  ];

  return (
    <div className="border-x border-t border-[#d3e9ea] bg-[#e8f5f1] shadow-[0_20px_60px_-42px_rgba(8,127,132,0.35)] backdrop-blur-xl" aria-busy={status === 'loading'} aria-label="Estadísticas principales">
      <div className="flex items-center justify-between border-b border-[#d3e9ea] bg-[#e8f5f1] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] sm:px-6">
        <span className="inline-flex items-center gap-2 text-[#0f6e68]"><span className="h-px w-6 bg-asanda-orange" aria-hidden="true" />Cifras oficiales vigentes</span>
        <span className="hidden sm:inline">Fuente: registro ASANDA</span>
      </div>
      <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-4">
        {cards.map(({ value, label, icon: Icon, href, accent, edge, chip }) => (
          <Link
            key={label}
            to={href}
            aria-label={value === null ? `${label}: no disponible` : `${value} ${label.toLowerCase()}`}
            className={`group relative flex min-h-28 min-w-0 items-center gap-4 overflow-hidden rounded-[14px] border border-t-4 border-[#d3e9ea] bg-white px-5 py-5 text-asanda-ink transition-[transform,box-shadow,border-color] hover:shadow-lg motion-safe:hover:-translate-y-0.5 lg:min-h-32 lg:px-6 ${edge}`}
          >
            <span className={`flex size-14 shrink-0 items-center justify-center rounded-2xl border border-current/30 ${chip} ${accent}`}>
              <Icon size={24} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <strong className="font-display block min-w-10 text-[2.75rem] leading-none tracking-wide text-[#0b2530] tabular-nums">{value ?? '—'}</strong>
              <span className="mt-2 block text-xs font-bold uppercase tracking-[0.08em] text-slate-600 group-hover:text-asanda-navy">
                {label}
              </span>
            </span>
            <ArrowUpRight className={`absolute right-4 top-4 opacity-55 transition-opacity group-hover:opacity-100 ${accent}`} size={18} aria-hidden="true" />
          </Link>
        ))}
      </div>
      {status !== 'ready' && (
        <p className="border-t border-[#d3e9ea] px-5 py-2 text-center text-xs text-asanda-ink/75" role="status">
          {status === 'loading' ? 'Cargando estadísticas…' : 'Estadísticas no disponibles en este momento.'}
        </p>
      )}
    </div>
  );
};

export default HeroStats;
