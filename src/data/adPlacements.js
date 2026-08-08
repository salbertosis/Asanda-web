// Definición de placements publicitarios demo con dimensiones reservadas (anti-CLS).

export const adPlacements = [
    {
        id: 'hero-sponsor',
        kind: 'hero',
        dimensions: {
            desktop: { w: 800, h: 200, aspect: '4/1' },
            mobile: { w: 320, h: 160, aspect: '2/1' },
        },
    },
    {
        id: 'leaderboard',
        kind: 'leaderboard',
        dimensions: {
            desktop: { w: 728, h: 90, aspect: '728/90' },
            mobile: { w: 320, h: 120, aspect: '8/3' },
        },
    },
    {
        id: 'partner-grid',
        kind: 'partner-grid',
        dimensions: {
            cell: { w: 160, h: 160, aspect: '1/1' },
        },
    },
    {
        id: 'competition-sponsor',
        kind: 'competition-sponsor',
        dimensions: {
            inline: { w: 240, h: 64, aspect: '15/4' },
        },
    },
];

export const getPlacement = (placementId) =>
    adPlacements.find((placement) => placement.id === placementId) || null;
