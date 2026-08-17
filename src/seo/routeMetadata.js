import { approvedPublicSite, toPublicUrl } from '../config/publicSite.js';

export const routeMetadata = Object.freeze([
  { path: '/', title: 'ASANDA - Portal de Resultados de Natación Estadal', description: 'Resultados, calendario, récords y actualidad de los deportes acuáticos de Anzoátegui.', indexable: true },
  { path: '/noticias', title: 'Noticias', description: 'Noticias y actualidad de ASANDA.', indexable: true },
  { path: '/videos', title: 'Videos', description: 'Videos destacados de los deportes acuáticos de ASANDA.', indexable: true },
  { path: '/fotos', title: 'Fotos', description: 'Galería fotográfica de ASANDA.', indexable: true },
  { path: '/fotos/album/:id', title: 'Álbum de fotos', description: 'Álbum fotográfico de ASANDA.', indexable: true },
  { path: '/calendario', title: 'Calendario', description: 'Calendario de competencias de ASANDA.', indexable: true },
  { path: '/calendario/:slug', title: 'Detalle de competencia', description: 'Información oficial de una competencia del calendario ASANDA.', indexable: true },
  { path: '/resultados', title: 'Resultados', description: 'Resultados de competencias de ASANDA.', indexable: true },
  { path: '/atletas', title: 'Atletas', description: 'Atletas registrados en ASANDA.', indexable: true },
  { path: '/atletas-asociados', title: 'Atletas asociados', description: 'Atletas asociados a ASANDA.', indexable: true },
  { path: '/atletas-federados', title: 'Atletas federados', description: 'Atletas federados de ASANDA.', indexable: true },
  { path: '/clubes', title: 'Clubes', description: 'Clubes asociados a ASANDA.', indexable: true },
  { path: '/record-estadal', title: 'Récord estadal', description: 'Récords estadales de natación.', indexable: true },
  { path: '/legal', title: 'Información legal', description: 'Información legal institucional de ASANDA.', indexable: false },
  { path: '/privacidad', title: 'Privacidad', description: 'Información de privacidad institucional de ASANDA.', indexable: false },
  { path: '/publicidad/demo/:slug', title: 'Demostración publicitaria', description: 'Demostración de publicidad ficticia de ASANDA.', indexable: false },
  { path: '/admin', title: 'Administración', description: 'Acceso administrativo de ASANDA.', indexable: false },
  { path: '/admin/:path', title: 'Administración', description: 'Acceso administrativo de ASANDA.', indexable: false },
]);

const matches = (route, pathname) => route.path === pathname || (route.path.includes('/:') && pathname.startsWith(route.path.split('/:')[0] + '/'));
export const getRouteMetadata = (pathname) => routeMetadata.find((route) => matches(route, pathname)) ?? routeMetadata[0];
export const isDemoRoute = (pathname, search = '') => pathname.startsWith('/publicidad/demo/') || new URLSearchParams(search).get('ads') === 'demo';
export const getIndexableRoutes = () => routeMetadata.filter((route) => route.indexable && !route.path.includes('/:')).map((route) => route.path);

export function buildRouteMetadata(pathname, site = approvedPublicSite, search = '') {
  const route = getRouteMetadata(pathname);
  const canonicalUrl = toPublicUrl(pathname, site.canonicalOrigin);
  const image = toPublicUrl('/assets/social-card.svg', site.canonicalOrigin);
  const openGraph = { title: route.title, description: route.description, url: canonicalUrl, image };
  const jsonLd = canonicalUrl ? { '@context': 'https://schema.org', '@type': 'WebPage', name: route.title, description: route.description, url: canonicalUrl, image } : null;
  return { ...route, noindex: isDemoRoute(pathname, search) || !route.indexable, canonicalUrl, openGraph, jsonLd };
}
