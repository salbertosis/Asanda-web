import React from 'react';
import HeroSponsorSlot from './HeroSponsorSlot';
import LeaderboardSlot from './LeaderboardSlot';
import PartnerGridSlot from './PartnerGridSlot';
import CompetitionSponsorBadge from './CompetitionSponsorBadge';

const SECTIONS = [
    { title: 'Hero sponsor', Component: HeroSponsorSlot },
    { title: 'Leaderboard', Component: LeaderboardSlot },
    { title: 'Partner grid', Component: PartnerGridSlot },
    { title: 'Competition sponsor', Component: CompetitionSponsorBadge },
];

// Vista previa aislada para verificación de PR 1: se activa solo con
// ?ads=demo y no altera ninguna página visible existente.
const AdsDemoPreview = () => (
    <div className="min-h-screen bg-gray-50 py-10 dark:bg-dark-bg">
        <div className="container mx-auto max-w-5xl px-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                Vista previa de publicidad demo
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Previsualización aislada de los cuatro placements (?ads=demo). Todas las marcas
                son ficticias y cada creativo enlaza a una página interna de explicación.
            </p>
            {SECTIONS.map(({ title, Component }) => (
                <section key={title} className="mt-8">
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {title}
                    </h2>
                    <Component />
                </section>
            ))}
        </div>
    </div>
);

export default AdsDemoPreview;
