import React, { useEffect, useState } from 'react';
import { getFeaturedAthleteDirectory } from '../services/athletes';
import FeaturedAthleteCard from './FeaturedAthleteCard';
import FeaturedAthleteDialog from './FeaturedAthleteDialog';

const FeaturedAthleteDirectory = () => {
  const [athletes, setAthletes] = useState([]);
  const [status, setStatus] = useState('loading');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    getFeaturedAthleteDirectory(controller.signal)
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
    <div className="min-w-0" aria-busy={status === 'loading'}>
      {status === 'loading' && <div className="flex min-h-64 items-center justify-center text-slate-700 dark:text-slate-200" role="status">Cargando atletas destacados…</div>}
      {status === 'error' && <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200" role="alert">No pudimos cargar los atletas destacados. Intente nuevamente más tarde.</div>}
      {status === 'ready' && (
        <section aria-labelledby="featured-results-title">
          <div className="border-l-2 border-asanda-orange pl-4">
            <h2 id="featured-results-title" className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Selección publicada</h2>
            {athletes.length > 0 && <p data-testid="featured-result-context" aria-live="polite" className="mt-1 text-sm text-slate-600 dark:text-slate-300">{athletes.length} {athletes.length === 1 ? 'atleta destacado' : 'atletas destacados'}</p>}
          </div>
          {athletes.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" role="status">Todavía no hay atletas destacados publicados.</div>
          ) : (
            <div className="mt-5 grid min-w-0 gap-7 lg:grid-cols-2">
              {athletes.map((athlete) => (
                <FeaturedAthleteCard
                  key={athlete.profileKey}
                  athlete={athlete}
                  dialogId="featured-athlete-profile-dialog"
                  onOpen={(event) => setSelected({ athlete, returnFocus: event.currentTarget })}
                />
              ))}
            </div>
          )}
          {athletes.length > 0 && (
            <FeaturedAthleteDialog
              athlete={selected?.athlete || athletes[0]}
              open={Boolean(selected)}
              returnFocus={selected?.returnFocus}
              onDismiss={() => setSelected(null)}
            />
          )}
        </section>
      )}
    </div>
  );
};

export default FeaturedAthleteDirectory;
