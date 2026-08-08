import React from 'react';
import { Link } from 'react-router-dom';

const DISCLOSURE_LABELS = {
    'publicidad': 'Publicidad',
    'contenido-patrocinado': 'Contenido patrocinado',
    'presentado-por': 'Presentado por',
};

const BADGE_LABELS = {
    demo: 'Demo',
    ejemplo: 'Ejemplo',
};

// Dimensiones reservadas por placement (anti-CLS): min-h + aspect ratio.
// Leaderboard: tarjeta compacta < 768px, banner completo >= 768px.
export const SLOT_DIMENSION_STYLES = {
    'hero-sponsor': 'min-h-[160px] aspect-[2/1] md:aspect-[4/1] md:min-h-[200px]',
    'leaderboard': 'min-h-[120px] aspect-[8/3] md:aspect-[728/90] md:min-h-[90px]',
    'partner-grid': 'min-h-[160px] aspect-square',
    'competition-sponsor': 'min-h-[64px] aspect-[15/4]',
};

const SLOT_LAYOUT_STYLES = {
    'hero-sponsor': 'mx-auto w-full max-w-md rounded-2xl shadow-lg',
    'leaderboard': 'mx-auto w-full max-w-sm rounded-xl shadow-md md:max-w-none md:rounded-lg',
    'partner-grid': 'w-full rounded-xl shadow-sm',
    'competition-sponsor': 'mx-auto w-full max-w-xs rounded-lg shadow-sm',
};

// Marco compartido de slot publicitario (D3): landmark complementary,
// etiqueta de disclosure, badge Demo, link interno sponsored y foco visible.
const AdSlotFrame = ({ placement, ad, className = '' }) => {
    const { sponsor } = ad;
    const disclosure = DISCLOSURE_LABELS[sponsor.disclosure] ?? DISCLOSURE_LABELS.publicidad;
    const badge = BADGE_LABELS[sponsor.badge] ?? BADGE_LABELS.demo;

    return (
        <div
            role="complementary"
            aria-label={`Publicidad: ${sponsor.name}`}
            className={`flex flex-col overflow-hidden border border-gray-200 bg-white text-gray-900 motion-safe:animate-fade-in dark:border-gray-700 dark:bg-dark-surface dark:text-dark-text ${SLOT_DIMENSION_STYLES[placement.id] ?? ''} ${SLOT_LAYOUT_STYLES[placement.id] ?? ''} ${className}`}
        >
            <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {disclosure}
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                    {badge}
                </span>
            </div>
            <Link
                to={ad.destination}
                rel="sponsored noopener"
                className="flex min-h-0 flex-1 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
                <img
                    src={sponsor.creative.url}
                    alt={sponsor.creative.alt}
                    width={sponsor.creative.width}
                    height={sponsor.creative.height}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain p-2"
                />
            </Link>
        </div>
    );
};

export default AdSlotFrame;
