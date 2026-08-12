import React, { useEffect, useMemo, useState } from 'react';
import { Award, Building2, Users } from 'lucide-react';
import { getPublishedAthletes } from '../services/athletes';

const AthleteDirectory = ({ membershipType }) => {
  const [athletes, setAthletes] = useState([]);
  const [status, setStatus] = useState('loading');
  const [activeClub, setActiveClub] = useState('all');
  const isFederatedPage = membershipType === 'federated';

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    getPublishedAthletes(membershipType, controller.signal)
      .then((publishedAthletes) => {
        if (!active) return;
        setAthletes(publishedAthletes);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [membershipType]);

  const clubs = useMemo(() => [...new Map(
    athletes.map((athlete) => [athlete.clubId, {
      id: athlete.clubId,
      name: athlete.clubShortName || athlete.clubName,
    }])
  ).values()], [athletes]);

  const visibleAthletes = activeClub === 'all'
    ? athletes
    : athletes.filter((athlete) => athlete.clubId === activeClub);

  const emptyMessage = isFederatedPage
    ? 'No hay atletas federados publicados para este club.'
    : 'No hay atletas asociados publicados para este club.';

  if (status === 'loading') {
    return <div className="flex min-h-64 items-center justify-center text-slate-700 dark:text-slate-200" role="status">Cargando atletas…</div>;
  }

  if (status === 'error') {
    return <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800" role="alert">No pudimos cargar los atletas. Intentá nuevamente más tarde.</div>;
  }

  return (
    <div>
      {athletes.length > 0 && (
        <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-cyan-400">Directorio por club</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Seleccioná una institución para filtrar el plantel publicado.</p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Filtrar atletas por club">
            {[{ id: 'all', name: 'Todos' }, ...clubs].map((club) => (
              <button
                key={club.id}
                type="button"
                aria-pressed={activeClub === club.id}
                onClick={() => setActiveClub(club.id)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  activeClub === club.id
                    ? 'border-blue-700 bg-blue-700 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                }`}
              >
                {club.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {visibleAthletes.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" role="status">{emptyMessage}</div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleAthletes.map((athlete) => (
            <article key={athlete.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900">
              <div className="relative aspect-[4/3] overflow-hidden bg-blue-50 dark:bg-slate-800">
                <img src={athlete.photoUrl} alt={athlete.photoAlt} className="h-full w-full object-cover" />
                {athlete.isFederated && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-amber-950 shadow-sm">
                    <Award size={15} aria-hidden="true" /> Federado
                  </span>
                )}
              </div>
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-cyan-400">{athlete.clubShortName || athlete.clubName}</p>
                <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{athlete.name}</h2>
                {athlete.name !== athlete.fullName && <p className="text-sm text-slate-500 dark:text-slate-400">{athlete.fullName}</p>}
                <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 text-sm dark:border-slate-700">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Categoría</dt>
                    <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{athlete.category}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Género</dt>
                    <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{athlete.sex}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  {athlete.disciplines.length > 0 ? <Users size={17} className="mt-0.5 text-blue-600" aria-hidden="true" /> : <Building2 size={17} className="mt-0.5 text-blue-600" aria-hidden="true" />}
                  <span>{athlete.disciplines.length > 0 ? athlete.disciplines.join(', ') : athlete.clubName}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default AthleteDirectory;
