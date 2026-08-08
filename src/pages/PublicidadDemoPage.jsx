import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useNoindex } from '../hooks/useNoindex';
import { getSponsorBySlug } from '../services/ads';
import { CATEGORY_LABELS } from '../data/sponsors';

// Página interna de detalle demo (noindex): explica que el patrocinador y
// la campaña son ficticios. Nunca enlaza a destinos externos.
const PublicidadDemoPage = () => {
    const { slug } = useParams();
    useNoindex();
    const sponsor = getSponsorBySlug(slug);

    return (
        <main className="min-h-screen bg-gray-50 py-12 dark:bg-dark-bg">
            <div className="container mx-auto max-w-2xl px-4">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 rounded text-sm font-medium text-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-400"
                >
                    <ArrowLeft size={16} aria-hidden="true" />
                    Volver al inicio
                </Link>

                {sponsor ? (
                    <article className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-dark-surface">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                            Demo
                        </span>
                        <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-dark-text">
                            {sponsor.name}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {CATEGORY_LABELS[sponsor.category] ?? sponsor.category}
                        </p>
                        <img
                            src={sponsor.creative.url}
                            alt={sponsor.creative.alt}
                            width={sponsor.creative.width}
                            height={sponsor.creative.height}
                            loading="lazy"
                            decoding="async"
                            className="mt-4 w-full rounded-lg border border-gray-100 object-contain dark:border-gray-700"
                        />
                        <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                            <p>
                                <strong>{sponsor.name} es una marca ficticia.</strong> Este espacio
                                forma parte de una demostración del sistema de publicidad de ASANDA.
                            </p>
                            <p>
                                El patrocinador, la campaña y cualquier mensaje mostrado aquí son
                                ejemplos sin validez comercial: no representan un acuerdo, auspicio
                                ni relación real con marca alguna.
                            </p>
                            <p>
                                Esta página es interna y no debe indexarse en buscadores.
                            </p>
                        </div>
                    </article>
                ) : (
                    <article className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-dark-surface">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                            Ejemplo no disponible
                        </h1>
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                            El patrocinador ficticio solicitado no existe en el catálogo demo.
                        </p>
                    </article>
                )}
            </div>
        </main>
    );
};

export default PublicidadDemoPage;
