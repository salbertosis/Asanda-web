import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { buildRouteMetadata, isDemoRoute, routeMetadata } from '../src/seo/routeMetadata.js';
import { createPublicAssets } from '../scripts/generate-public-assets.mjs';
import { comparePerformance } from '../scripts/performance-regression.mjs';
import { registerWebVitals } from '../src/metrics/webVitals.js';

const origin = 'https://asanda.org.ve';
const site = { canonicalOrigin: origin, canonicalOriginApproved: true, identity: { value: 'ASANDA', approved: true }, copyright: { notice: 'ASANDA 2026', approved: true }, social: [{ label: 'Instagram', href: 'https://instagram.com/asanda', approved: true }], legal: { legalApproved: true, privacyApproved: true }, criticalAssets: ['/assets/hero.svg', '/favicon.svg', '/assets/social-card.svg'] };

const paths = routeMetadata.map((route) => route.path);
assert.equal(new Set(paths).size, paths.length, 'route metadata paths must be unique');
for (const path of ['/', '/noticias', '/videos', '/fotos', '/fotos/album/:id', '/calendario', '/resultados', '/atletas', '/atletas-asociados', '/atletas-federados', '/clubes', '/record-estadal', '/legal', '/privacidad', '/publicidad/demo/:slug']) assert(paths.includes(path), `missing route metadata: ${path}`);

const metadata = buildRouteMetadata('/resultados', site);
for (const url of [metadata.canonicalUrl, metadata.openGraph.url, metadata.openGraph.image, metadata.jsonLd.url, metadata.jsonLd.image]) assert(url.startsWith(origin), `metadata escaped canonical origin: ${url}`);
assert.equal(isDemoRoute('/publicidad/demo/aquaflow-demo'), true);
assert.equal(isDemoRoute('/', '?ads=demo'), true);
assert.equal(isDemoRoute('/'), false);

const assets = createPublicAssets(site);
assert.match(assets.robots, new RegExp(`Sitemap: ${origin}/sitemap\\.xml`));
assert.match(assets.sitemap, new RegExp(`<loc>${origin}/resultados</loc>`));
assert.doesNotMatch(createPublicAssets().sitemap, /<loc>\//, 'unapproved sitemap must not emit relative locations');
assert.equal(assets.manifest.icons[0].src, '/favicon.svg');

for (const file of ['public/assets/hero.svg', 'public/assets/social-card.svg']) await access(file);
assert.equal(comparePerformance({ scores: { performance: 0.78 }, metrics: { LCP: 2200 } }, { scores: { performance: 0.8 }, metrics: { LCP: 2000 } }).ok, false);
assert.equal(comparePerformance({ scores: { performance: 0.81 }, metrics: { LCP: 1900 } }, { scores: { performance: 0.8 }, metrics: { LCP: 2000 } }).ok, true);
assert.equal(comparePerformance({ scores: {}, metrics: {} }, { scores: { performance: 0.8 }, metrics: { LCP: 2000 } }).ok, false, 'missing measurements must fail closed');
const registrations = [];
assert.equal(registerWebVitals(Object.fromEntries(['onCLS', 'onINP', 'onLCP'].map((name) => [name, (...args) => registrations.push(args)])), () => {}), true);
assert.equal(registrations.length, 3, 'Web Vitals must register CLS, INP, and LCP without a network sink');
console.log(`Metadata/resource regression passed: ${paths.length} routes, one origin, crawl assets, local resources, and baseline guard.`);
