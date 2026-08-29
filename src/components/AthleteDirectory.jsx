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
    athletes.filter((athlete) => athlete.clubId).map((athlete) => [athlete.clubId, {
      id: athlete.clubId,
      name: athlete.clubShortName || athlete.clubName,
    }])
  ).values()], [athletes]);

  const visibleAthletes = activeClub === 'all'
    ? athletes
    : athletes.filter((athlete) => athlete.clubId === activeClub);
  const selectedClub = clubs.find((club) => club.id === activeClub);
  const totalLabel = `${athletes.length} ${athletes.length === 1 ? 'atleta publicado' : 'atletas publicados'}`;
  const resultContext = activeClub === 'all'
    ? totalLabel
    : `${visibleAthletes.length} de ${athletes.length} ${athletes.length === 1 ? 'atleta' : 'atletas'} · ${selectedClub?.name}`;

  const emptyMessage = membershipType
    ? `No hay atletas ${isFederatedPage ? 'federados' : 'asociados'} publicados para este club.`
    : 'No hay atletas publicados disponibles.';

  if (status === 'loading') {
    return <div className="flex min-h-64 items-center justify-center text-slate-700 dark:text-slate-200" role="status">Cargando atletas…</div>;
  }

  if (status === 'error') {
    return <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800" role="alert">No pudimos cargar los atletas. Intentá nuevamente más tarde.</div>;
  }

  return (
    <div className="min-w-0 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-7">
      {athletes.length > 0 && (
        <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-24 lg:p-5" aria-labelledby="athlete-club-filter-title">
          <h2 id="athlete-club-filter-title" className="text-base font-bold text-slate-950 dark:text-white">Filtrar por club</h2>
          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">Seleccioná una institución para consultar su plantel publicado.</p>
          <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Filtrar atletas por club">
            {[{ id: 'all', name: 'Todos' }, ...clubs].map((club) => (
              <button
                key={club.id}
                type="button"
                aria-pressed={activeClub === club.id}
                onClick={() => setActiveClub(club.id)}
                className={`min-h-11 shrink-0 rounded-xl border px-4 py-2 text-left text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-asanda-orange motion-reduce:transition-none ${
                  activeClub === club.id
                    ? 'border-asanda-deep bg-asanda-deep text-white shadow-sm ring-1 ring-asanda-orange/50 dark:border-cyan-400 dark:bg-cyan-950'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-cyan-700 hover:text-asanda-deep dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-200'
                }`}
              >
                {club.name}
              </button>
            ))}
          </div>
        </aside>
      )}

      <section className={`min-w-0 ${athletes.length > 0 ? 'mt-5 lg:mt-0' : ''}`} aria-labelledby="athlete-results-title">
        <div className="border-l-2 border-asanda-orange pl-4">
          <h2 id="athlete-results-title" className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Atletas publicados</h2>
          {athletes.length > 0 && <p data-testid="athlete-result-context" aria-live="polite" className="mt-1 text-sm text-slate-600 dark:text-slate-300">{resultContext}</p>}
        </div>
        {visibleAthletes.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" role="status">{emptyMessage}</div>
        ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visibleAthletes.map((athlete) => (
            <article key={athlete.id} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_35px_-28px_rgba(15,23,42,0.55)] dark:border-slate-700 dark:bg-slate-900">
              <div className="relative aspect-[4/3] overflow-hidden border-b border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                <img src={athlete.photoUrl} alt={athlete.photoAlt} width="320" height="240" loading="lazy" className={`h-full w-full ${athlete.photoUrl === '/asanda.png' ? 'object-contain p-8' : 'object-cover'}`} />
                {athlete.isFederated && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-amber-950 shadow-sm">
                    <Award size={15} aria-hidden="true" /> Federado
                  </span>
                )}
              </div>
              <div className="border-t-2 border-t-asanda-orange/70 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-cyan-400">{athlete.clubShortName || athlete.clubName}</p>
                <h3 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{athlete.name}</h3>
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
      </section>
    </div>
  );
};

export default AthleteDirectory;
