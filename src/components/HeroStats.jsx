import React from 'react';
import { Link } from 'react-router-dom';
import { Award, Building2, Users, Waves } from 'lucide-react';

const DEMO_PREINFANTIL_COUNT = 15;

const HeroStats = ({ atletas, clubs }) => {
  const stats = [
    {
      value: DEMO_PREINFANTIL_COUNT,
      label: 'Atletas preinfantiles',
      icon: Waves,
      href: '/atletas',
    },
    {
      value: atletas.filter((atleta) => atleta.tipo === 'asociado').length,
      label: 'Atletas asociados',
      icon: Users,
      href: '/atletas-asociados',
    },
    {
      value: atletas.filter((atleta) => atleta.tipo === 'federado').length,
      label: 'Atletas federados',
      icon: Award,
      href: '/atletas-federados',
    },
    {
      value: Math.max(clubs.length - 1, 0),
      label: 'Clubes activos',
      icon: Building2,
      href: '/clubes',
    },
  ];

  return (
    <div className="grid gap-px border-x border-t border-white/20 bg-white/20 backdrop-blur-md sm:grid-cols-2 xl:grid-cols-4" aria-label="Estadísticas principales">
      {stats.map(({ value, label, icon: Icon, href }) => (
        <Link
          key={label}
          to={href}
          aria-label={`${value} ${label.toLowerCase()}`}
          className="group flex min-h-24 min-w-0 items-center gap-4 bg-asanda-ink/80 px-5 py-4 text-white transition-colors hover:bg-asanda-navy/90 lg:min-h-28 lg:px-6"
        >
          <span className="flex size-11 shrink-0 items-center justify-center border border-cyan-200/40 bg-cyan-300/10 text-cyan-200">
            <Icon size={21} aria-hidden="true" />
          </span>
          <span>
            <strong className="font-display block text-3xl leading-none tracking-wide lg:text-4xl">{value}</strong>
            <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-blue-100 transition-colors group-hover:text-white">
              {label}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
};

export default HeroStats;
