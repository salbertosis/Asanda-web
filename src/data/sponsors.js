// Catálogo de patrocinadores ficticios para el sistema de publicidad demo.
// Ninguna de estas marcas existe ni representa un acuerdo comercial real.

export const SPONSOR_CATALOG_VERSION = 'v1';

export const SPONSOR_CATEGORIES = [
    'equipo-acuatico',
    'salud-deportiva',
    'hidratacion',
    'entrenamiento',
];

export const CATEGORY_LABELS = {
    'equipo-acuatico': 'Equipo acuático',
    'salud-deportiva': 'Salud deportiva',
    'hidratacion': 'Hidratación',
    'entrenamiento': 'Entrenamiento',
};

export const APPROVED_SPONSOR_IDENTITIES = Object.freeze([
    Object.freeze({ id: 'aq-1', slug: 'aquaflow-demo', name: 'AQUAFLOW Demo', category: 'equipo-acuatico' }),
    Object.freeze({ id: 'hl-1', slug: 'vitalsport-demo', name: 'VITALSPORT Demo', category: 'salud-deportiva' }),
    Object.freeze({ id: 'hy-1', slug: 'hidraflux-demo', name: 'HIDRAFLUX Demo', category: 'hidratacion' }),
    Object.freeze({ id: 'tr-1', slug: 'entrenax-demo', name: 'ENTRENAX Demo', category: 'entrenamiento' }),
]);

export const sponsors = [
    {
        id: 'aq-1',
        slug: 'aquaflow-demo',
        name: 'AQUAFLOW Demo',
        category: 'equipo-acuatico',
        creative: {
            url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=200&fit=crop&q=80',
            alt: 'AQUAFLOW Demo — marca ficticia de equipo acuático',
            width: 800,
            height: 200,
        },
        disclosure: 'presentado-por',
        badge: 'demo',
    },
    {
        id: 'hl-1',
        slug: 'vitalsport-demo',
        name: 'VITALSPORT Demo',
        category: 'salud-deportiva',
        creative: {
            url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=200&fit=crop&q=80',
            alt: 'VITALSPORT Demo — marca ficticia de salud deportiva',
            width: 800,
            height: 200,
        },
        disclosure: 'contenido-patrocinado',
        badge: 'demo',
    },
    {
        id: 'hy-1',
        slug: 'hidraflux-demo',
        name: 'HIDRAFLUX Demo',
        category: 'hidratacion',
        creative: {
            url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=200&fit=crop&q=80',
            alt: 'HIDRAFLUX Demo — marca ficticia de hidratación',
            width: 800,
            height: 200,
        },
        disclosure: 'publicidad',
        badge: 'demo',
    },
    {
        id: 'tr-1',
        slug: 'entrenax-demo',
        name: 'ENTRENAX Demo',
        category: 'entrenamiento',
        creative: {
            url: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&h=200&fit=crop&q=80',
            alt: 'ENTRENAX Demo — marca ficticia de entrenamiento',
            width: 800,
            height: 200,
        },
        disclosure: 'presentado-por',
        badge: 'demo',
    },
];
