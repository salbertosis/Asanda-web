import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { approvedPublicSite } from '../src/config/publicSite.js';
import { buildNewsArticleMetadata, buildRouteMetadata, isDemoRoute, routeMetadata } from '../src/seo/routeMetadata.js';
import { createPublicAssets } from '../scripts/generate-public-assets.mjs';
import { comparePerformance, median } from '../scripts/performance-regression.mjs';
import { registerWebVitals } from '../src/metrics/webVitals.js';

const lighthouse = createRequire(import.meta.url)('../lighthouserc.cjs').ci;

const origin = 'https://asanda.org.ve';
const site = { canonicalOrigin: origin, canonicalOriginApproved: true, identity: { value: 'ASANDA', approved: true }, copyright: { notice: 'ASANDA 2026', approved: true }, social: [{ label: 'Instagram', href: 'https://instagram.com/asanda', approved: true }], legal: { legalApproved: true, privacyApproved: true }, criticalAssets: ['/assets/hero.svg', '/favicon.svg', '/assets/social-card.svg'] };
assert.equal(approvedPublicSite.canonicalOrigin, 'https://asanda-web.vercel.app');
assert.equal(approvedPublicSite.identity.value, 'ASANDA'); assert.deepEqual(approvedPublicSite.social, [{ label: 'Instagram', href: 'https://www.instagram.com/asandaanzoategui/', approved: true }, { label: 'WhatsApp', href: 'https://wa.me/5804124090715', approved: true }]);
assert.deepEqual(approvedPublicSite.criticalAssets, ['/favicon.svg', '/assets/hero.svg', '/assets/social-card.svg']);

const paths = routeMetadata.map((route) => route.path);
assert.equal(new Set(paths).size, paths.length, 'route metadata paths must be unique');
for (const path of ['/', '/noticias', '/noticias/:slug', '/videos', '/fotos', '/fotos/album/:id', '/calendario', '/resultados', '/atletas', '/atletas-destacados', '/atletas-asociados', '/atletas-federados', '/clubes', '/record-estadal', '/legal', '/privacidad', '/publicidad/demo/:slug']) assert(paths.includes(path), `missing route metadata: ${path}`);

const metadata = buildRouteMetadata('/resultados', site);
for (const url of [metadata.canonicalUrl, metadata.openGraph.url, metadata.openGraph.image, metadata.jsonLd.url, metadata.jsonLd.image]) assert(url.startsWith(origin), `metadata escaped canonical origin: ${url}`);
assert.equal(isDemoRoute('/publicidad/demo/aquaflow-demo'), true);
assert.equal(isDemoRoute('/', '?ads=demo'), true);
assert.equal(isDemoRoute('/'), false);
const articleMetadata = buildNewsArticleMetadata({ titulo: 'Noticia real', resumen: 'Resumen real', fechaIso: '2026-08-18T10:00:00Z', actualizadaIso: null, imagenSeo: null }, '/noticias/noticia-real', site);
assert.equal(articleMetadata.jsonLd['@type'], 'NewsArticle');
assert.equal(articleMetadata.jsonLd.dateModified, undefined, 'missing updated_at must not invent dateModified');
assert.equal(articleMetadata.jsonLd.image, undefined, 'missing hero must not invent an article image');

const assets = createPublicAssets(site);
assert.match(assets.robots, new RegExp(`Sitemap: ${origin}/sitemap\\.xml`));
assert.match(assets.sitemap, new RegExp(`<loc>${origin}/resultados</loc>`));
assert.match(assets.sitemap, new RegExp(`<loc>${origin}/atletas-destacados</loc>`));
assert.doesNotMatch(createPublicAssets().sitemap, /<loc>\//, 'unapproved sitemap must not emit relative locations');
assert.equal(assets.manifest.icons[0].src, '/favicon.svg');

for (const file of ['public/assets/hero.svg', 'public/assets/social-card.svg']) await access(file);
assert.equal(comparePerformance({ scores: { performance: 0.78 }, metrics: { LCP: 2200 } }, { scores: { performance: 0.8 }, metrics: { LCP: 2000 } }).ok, false);
assert.equal(comparePerformance({ scores: { performance: 0.81 }, metrics: { LCP: 1900 } }, { scores: { performance: 0.8 }, metrics: { LCP: 2000 } }).ok, true);
assert.equal(comparePerformance({ scores: {}, metrics: {} }, { scores: { performance: 0.8 }, metrics: { LCP: 2000 } }).ok, false, 'missing measurements must fail closed');
assert.equal(comparePerformance({ metrics: { LCP: 888 } }, { metrics: { LCP: 872 } }, { metrics: { LCP: 100 } }).ok, true, 'small lab jitter is accepted within the documented tolerance');
assert.equal(comparePerformance({ metrics: { LCP: 973 } }, { metrics: { LCP: 872 } }, { metrics: { LCP: 100 } }).ok, false, 'real lab degradation remains a failure');
assert.equal(median([1756, 952, 1516, 928, 840]), 952, 'odd samples use their mathematical median');
assert.equal(median([840, 928, 952, 1516]), 940, 'even samples average their two middle values');
assert.equal(median([840, null, 952]), null, 'missing samples fail closed');
assert.equal(lighthouse.collect.numberOfRuns, 3, 'Lighthouse must collect three runs per route');
assert.deepEqual(lighthouse.assert.assertions['categories:performance'], ['error', { minScore: 0.8, aggregationMethod: 'median' }]);
assert.deepEqual(lighthouse.assert.assertions['categories:accessibility'], ['error', { minScore: 0.9, aggregationMethod: 'median' }]);
assert.deepEqual(lighthouse.assert.assertions['largest-contentful-paint'], ['warn', { maxNumericValue: 2500, aggregationMethod: 'median' }]);
assert.deepEqual(lighthouse.assert.assertions['cumulative-layout-shift'], ['warn', { maxNumericValue: 0.1, aggregationMethod: 'median' }]);
const registrations = [];
assert.equal(registerWebVitals(Object.fromEntries(['onCLS', 'onINP', 'onLCP'].map((name) => [name, (...args) => registrations.push(args)])), () => {}), true);
assert.equal(registrations.length, 3, 'Web Vitals must register CLS, INP, and LCP without a network sink');
console.log(`Metadata/resource regression passed: ${paths.length} routes, one origin, crawl assets, local resources, and baseline guard.`);
