import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, MapPin, ShieldCheck, Waves } from 'lucide-react';
import { getCloudinaryUrl } from '../config/cloudinary';
import { getCompetenciaBySlug } from '../data/calendario';

const DISCIPLINE_LABELS = {
  natacion: 'Natación',
  waterpolo: 'Water Polo',
  'aguas-abiertas': 'Aguas Abiertas',
};

const getLogoUrl = (competition) => {
  if (competition.logoUrl) return competition.logoUrl;
  return competition.logoPublicId
    ? getCloudinaryUrl(competition.logoPublicId, { width: 640, height: 384, crop: 'pad', background: 'transparent' })
    : null;
};

const CompetenciaPage = () => {
  const { slug } = useParams();
  const competition = getCompetenciaBySlug(slug);

  if (!competition) {
    return (
      <section className="min-h-[60vh] bg-slate-50 px-4 py-20 text-center dark:bg-slate-950">
        <h1 className="text-3xl font-bold text-slate-950 dark:text-white">Competencia no encontrada</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">El evento solicitado no existe en el calendario publicado.</p>
        <Link to="/calendario" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0F4C5C] px-5 font-bold text-white">
          <ArrowLeft size={18} aria-hidden="true" /> Volver al calendario
        </Link>
      </section>
    );
  }

  const logoUrl = getLogoUrl(competition);
  const dateRange = competition.fechaInicio === competition.fechaFin
    ? `${competition.fechaInicio} de ${competition.mes} de ${competition.año}`
    : `${competition.fechaInicio} al ${competition.fechaFin} de ${competition.mes} de ${competition.año}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <section className="bg-[#0F4C5C] text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-5 sm:py-20">
          <Link to="/calendario" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-cyan-100 transition-colors hover:text-white">
            <ArrowLeft size={18} aria-hidden="true" /> Volver al calendario
          </Link>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Detalle de competencia</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">{competition.nombre}</h1>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold"><Waves size={16} aria-hidden="true" /> {DISCIPLINE_LABELS[competition.deporte] || 'Deporte acuático'}</span>
            {competition.reconocido && <span className="inline-flex items-center gap-2 rounded-full bg-emerald-300/15 px-4 py-2 text-sm font-bold text-emerald-100"><CheckCircle2 size={16} aria-hidden="true" /> Competencia oficial</span>}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-14">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Información del evento</h2>
          <dl className="mt-7 grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/70">
              <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"><CalendarDays size={17} className="text-[#0F4C5C] dark:text-cyan-300" aria-hidden="true" /> Fecha</dt>
              <dd className="mt-3 font-bold text-slate-950 dark:text-white">{dateRange}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/70">
              <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"><MapPin size={17} className="text-[#0F4C5C] dark:text-cyan-300" aria-hidden="true" /> Sede</dt>
              <dd className="mt-3 font-bold text-slate-950 dark:text-white">{competition.ubicacion}</dd>
            </div>
          </dl>
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
            La convocatoria, horarios, categorías e inscripciones se publicarán cuando sean confirmados por la organización responsable.
          </div>
        </div>

        <aside className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900" aria-label="Organización responsable">
          {logoUrl ? <img src={logoUrl} alt={competition.logoAlt || `Logo de ${competition.organizador}`} width="320" height="192" className="aspect-[5/3] w-full max-w-64 object-contain" /> : <ShieldCheck size={48} className="text-[#0F4C5C] dark:text-cyan-300" aria-hidden="true" />}
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Organiza</p>
          <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{competition.organizador}</p>
        </aside>
      </section>
    </div>
  );
};

export default CompetenciaPage;
