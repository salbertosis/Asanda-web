import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getFeaturedAthletePreview } from '../services/athletes';

const AthletesSection = () => {
  const [athletes, setAthletes] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    getFeaturedAthletePreview(controller.signal)
      .then((featuredAthletes) => {
        if (!active) return;
        setAthletes(featuredAthletes);
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

  return (
    <section id="atletas" aria-labelledby="featured-athletes-title" aria-busy={status === 'loading'} className="scroll-mt-[116px] bg-white py-12 dark:bg-slate-950">
      <div className="container mx-auto min-w-0 px-4">
        <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="featured-athletes-title" className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Atletas Destacados</h2>
            <p className="text-gray-600 dark:text-slate-300">Una selección de atletas destacados por ASANDA</p>
          </div>
          <Link to="/atletas-destacados" className="inline-flex min-h-11 items-center gap-2 font-medium text-blue-700 transition-colors hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-cyan-400 dark:hover:text-cyan-300">
            Ver todos <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
        {status === 'loading' && <p role="status" className="min-h-64 rounded-xl border border-gray-200 bg-gray-50 p-6 text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Cargando atletas destacados…</p>}
        {status === 'error' && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 font-medium text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">No pudimos cargar los atletas destacados. Intente nuevamente más tarde.</p>}
        {status === 'ready' && athletes.length === 0 && <p role="status" className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Todavía no hay atletas destacados publicados.</p>}
        {status === 'ready' && athletes.length > 0 && <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {athletes.map((athlete) => (
            <article key={athlete.profileKey} className="min-w-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <div className="h-64 overflow-hidden bg-gray-100 dark:bg-slate-800">
                <img src={athlete.photoUrl} alt={athlete.photoAlt} loading="lazy" className={`h-full w-full ${athlete.photoUrl === '/asanda.png' ? 'object-contain p-8' : 'object-cover'}`} />
              </div>
              <div className="p-6">
                <p className="text-sm font-semibold uppercase tracking-wider text-blue-700 dark:text-cyan-400">{athlete.organization}</p>
                <h3 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{athlete.name}</h3>
                <p className="mt-3 text-sm text-gray-600 dark:text-slate-300"><span className="font-semibold">Categoría:</span> {athlete.category}</p>
              </div>
            </article>
          ))}
        </div>}
      </div>
    </section>
  );
};

export default AthletesSection;
