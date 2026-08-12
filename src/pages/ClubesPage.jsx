import React, { useEffect, useState } from 'react';
import { Award, Building2, Calendar, Instagram, Mail, MapPin, Phone, Users } from 'lucide-react';
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
    <div className="flex items-start gap-2 text-gray-600">
      <Icon size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
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
    <div className="min-h-screen bg-gray-50">
      <PageHero
        title="Clubes Activos"
        backgroundImage="https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&h=1080&fit=crop&q=80"
      />

      <section className="min-h-96 bg-gray-50 py-12" aria-label="Directorio de clubes">
        <div className="container mx-auto px-4">
          {status === 'loading' && (
            <div className="flex min-h-64 items-center justify-center" role="status">
              <p className="text-lg font-medium text-gray-700">Cargando clubes…</p>
            </div>
          )}

          {status === 'error' && (
            <div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-800" role="alert">
              No pudimos cargar los clubes. Intentá nuevamente más tarde.
            </div>
          )}

          {status === 'ready' && clubs.length === 0 && (
            <div className="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-700" role="status">
              No hay clubes publicados en este momento.
            </div>
          )}

          {status === 'ready' && clubs.length > 0 && (
            <>
              <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-lg bg-white p-6 shadow-md">
                  <div className="mb-2 flex items-center gap-3">
                    <Building2 className="text-blue-600" size={24} aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-gray-900">Total de Clubes</h2>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">{totals.clubs}</div>
                </div>
                <div className="rounded-lg bg-white p-6 shadow-md">
                  <div className="mb-2 flex items-center gap-3">
                    <Users className="text-green-600" size={24} aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-gray-900">Atletas Asociados</h2>
                  </div>
                  <div className="text-3xl font-bold text-green-600">{totals.associatedAthletes}</div>
                </div>
                <div className="rounded-lg bg-white p-6 shadow-md">
                  <div className="mb-2 flex items-center gap-3">
                    <Award className="text-yellow-600" size={24} aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-gray-900">Atletas Federados</h2>
                  </div>
                  <div className="text-3xl font-bold text-yellow-600">{totals.federatedAthletes}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {clubs.map((club) => (
                  <article key={club.id} className="overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-xl">
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500">
                      {club.logoUrl && (
                        <img
                          src={club.logoUrl}
                          alt={club.logoAlt}
                          className="h-full w-full bg-white object-contain"
                          onError={(event) => { event.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <h2 className="text-xl font-bold text-white">{club.name}</h2>
                        {club.shortName && <p className="text-sm font-semibold text-white/90">{club.shortName}</p>}
                      </div>
                    </div>

                    <div className="p-6">
                      {club.description && <p className="mb-4 text-sm text-gray-600">{club.description}</p>}

                      <div className="mb-4 grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-blue-50 p-3">
                          <div className="mb-1 text-xs text-gray-600">Asociados</div>
                          <div className="text-lg font-bold text-blue-600">{club.associatedAthletes}</div>
                        </div>
                        <div className="rounded-lg bg-yellow-50 p-3">
                          <div className="mb-1 text-xs text-gray-600">Federados</div>
                          <div className="text-lg font-bold text-yellow-600">{club.federatedAthletes}</div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <ContactRow contact={club.address} icon={MapPin} />
                        <ContactRow contact={club.phone} icon={Phone} />
                        <ContactRow contact={club.email} icon={Mail} />
                        <ContactRow contact={club.social} icon={Instagram} />
                        {club.foundedYear && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar size={16} className="flex-shrink-0" aria-hidden="true" />
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
