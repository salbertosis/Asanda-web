// Campañas demo: vinculan patrocinadores ficticios con placements.
// Todas comparten la misma prioridad: jerarquía igualitaria, sin niveles.

const START = '2025-01-01';
const END = '2099-12-31';

export const campaigns = [
    { id: 'c-hero-1', sponsorId: 'aq-1', placementId: 'hero-sponsor', startDate: START, endDate: END, priority: 1 },
    { id: 'c-hero-2', sponsorId: 'hl-1', placementId: 'hero-sponsor', startDate: START, endDate: END, priority: 1 },
    { id: 'c-hero-3', sponsorId: 'hy-1', placementId: 'hero-sponsor', startDate: START, endDate: END, priority: 1 },
    { id: 'c-hero-4', sponsorId: 'tr-1', placementId: 'hero-sponsor', startDate: START, endDate: END, priority: 1 },
    { id: 'c-lead-1', sponsorId: 'aq-1', placementId: 'leaderboard', startDate: START, endDate: END, priority: 1 },
    { id: 'c-lead-2', sponsorId: 'hl-1', placementId: 'leaderboard', startDate: START, endDate: END, priority: 1 },
    { id: 'c-lead-3', sponsorId: 'hy-1', placementId: 'leaderboard', startDate: START, endDate: END, priority: 1 },
    { id: 'c-lead-4', sponsorId: 'tr-1', placementId: 'leaderboard', startDate: START, endDate: END, priority: 1 },
    { id: 'c-grid-1', sponsorId: 'aq-1', placementId: 'partner-grid', startDate: START, endDate: END, priority: 1 },
    { id: 'c-grid-2', sponsorId: 'hl-1', placementId: 'partner-grid', startDate: START, endDate: END, priority: 1 },
    { id: 'c-grid-3', sponsorId: 'hy-1', placementId: 'partner-grid', startDate: START, endDate: END, priority: 1 },
    { id: 'c-grid-4', sponsorId: 'tr-1', placementId: 'partner-grid', startDate: START, endDate: END, priority: 1 },
    { id: 'c-comp-1', sponsorId: 'aq-1', placementId: 'competition-sponsor', startDate: START, endDate: END, priority: 1 },
    { id: 'c-comp-2', sponsorId: 'hl-1', placementId: 'competition-sponsor', startDate: START, endDate: END, priority: 1 },
    { id: 'c-comp-3', sponsorId: 'hy-1', placementId: 'competition-sponsor', startDate: START, endDate: END, priority: 1 },
    { id: 'c-comp-4', sponsorId: 'tr-1', placementId: 'competition-sponsor', startDate: START, endDate: END, priority: 1 },
];
