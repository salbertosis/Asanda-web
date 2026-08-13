import React, { useEffect, useState } from 'react';
import { Building2, Calendar, Instagram, Mail, MapPin, Phone, Users } from 'lucide-react';
import PageHero from '../components/PageHero';
import { getClubTotals, getPublishedClubs } from '../services/clubs';

const ContactRow = ({ contact, icon: Icon }) => {
  if (!contact) return null;

  const content = contact.url ? (
    <a className="hover:text-blue-700 hover:underline" href={contact.url} rel="noreferrer" target="_blank">
      {contact.value}
    </a>
  ) : contact.value;

  return (
    <div className="flex items-start gap-3 text-gray-600 dark:text-slate-300">
      <Icon size={17} className="mt-0.5 flex-shrink-0 text-blue-600 dark:text-cyan-400" aria-hidden="true" />
      <span className="min-w-0 break-words">{content}</span>
    </div>
  );
};

const ClubesPage = () => {
  const [clubs, setClubs] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    getPublishedClubs(controller.signal)
      .then((publishedClubs) => {
        if (!active) return;
        setClubs(publishedClubs);
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

  const totals = getClubTotals(clubs);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHero
        title="Clubes Activos"
        subtitle="Instituciones afiliadas que impulsan los deportes acuáticos en Anzoátegui"
        compact
        backgroundImage="https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&h=1080&fit=crop&q=80"
      />

      <section className="min-h-96 bg-slate-50 py-10 dark:bg-slate-950 md:py-14" aria-label="Directorio de clubes">
        <div className="container mx-auto max-w-6xl px-4">
          {status === 'loading' && (
            <div className="flex min-h-64 items-center justify-center" role="status">
              <p className="text-lg font-medium text-slate-700 dark:text-slate-200">Cargando clubes…</p>
            </div>
          )}

          {status === 'error' && (
            <div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-800" role="alert">
              No pudimos cargar los clubes. Intentá nuevamente más tarde.
            </div>
          )}

          {status === 'ready' && clubs.length === 0 && (
            <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" role="status">
              No hay clubes publicados en este momento.
            </div>
          )}

          {status === 'ready' && clubs.length > 0 && (
            <>
              <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-7 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-700 dark:text-cyan-400">Organizaciones afiliadas</p>
                  <h2 className="text-2xl font-bold text-slate-950 dark:text-white md:text-3xl">Equipos que conforman nuestra comunidad acuática</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Conocé los clubes activos, su trayectoria y el plantel registrado ante ASANDA.
                  </p>
                </div>
                <div className="flex shrink-0 gap-2" aria-label="Resumen del directorio">
                  <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                    <Building2 size={17} aria-hidden="true" />
                    {totals.clubs} {totals.clubs === 1 ? 'club' : 'clubes'}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">
                    <Users size={17} aria-hidden="true" />
                    {totals.athletes} {totals.athletes === 1 ? 'atleta' : 'atletas'}
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                {clubs.map((club) => (
                  <article key={club.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900 md:grid md:grid-cols-[280px_1fr]">
                    <div className="relative flex min-h-64 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#eff6ff,_#dbeafe_45%,_#bfdbfe)] p-8 dark:bg-[radial-gradient(circle_at_top,_#1e3a5f,_#0f2744_55%,_#0f172a)] md:min-h-full">
                      {club.logoUrl ? (
                        <img
                          src={club.logoUrl}
                          alt={club.logoAlt}
                          className="aspect-[5/3] w-full max-w-60 object-contain drop-shadow-xl"
                          onError={(event) => { event.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <span className="font-brand text-5xl font-bold tracking-[0.08em] text-blue-800 dark:text-cyan-300" aria-hidden="true">
                          {club.shortName || club.name.slice(0, 3).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col p-6 md:p-8">
                      <div className="mb-5">
                        {club.shortName && <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-cyan-400">{club.shortName}</p>}
                        <h2 className="text-2xl font-bold text-slate-950 dark:text-white md:text-3xl">{club.name}</h2>
                        {club.description && <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300 md:text-base">{club.description}</p>}
                      </div>

                      <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="rounded-xl bg-blue-700 p-2.5 text-white"><Users size={20} aria-hidden="true" /></span>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Plantel registrado</p>
                              <p className="text-xl font-bold text-slate-950 dark:text-white">{club.totalAthletes} atletas</p>
                            </div>
                          </div>
                          <div className="flex gap-2 text-sm">
                            <span className="rounded-full bg-blue-100 px-3 py-1.5 font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-200">{club.associatedAthletes} asociados</span>
                            <span className="rounded-full bg-amber-100 px-3 py-1.5 font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">{club.federatedAthletes} federados</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto grid gap-3 border-t border-slate-200 pt-5 text-sm dark:border-slate-700 sm:grid-cols-2">
                        <ContactRow contact={club.address} icon={MapPin} />
                        <ContactRow contact={club.phone} icon={Phone} />
                        <ContactRow contact={club.email} icon={Mail} />
                        <ContactRow contact={club.social} icon={Instagram} />
                        {club.foundedYear && (
                          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                            <Calendar size={17} className="flex-shrink-0 text-blue-600 dark:text-cyan-400" aria-hidden="true" />
                            <span>Fundado en {club.foundedYear}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default ClubesPage;
