const baseUrl = process.argv[2] || process.env.PRODUCTION_URL;

if (!baseUrl) {
  throw new Error('Usage: node scripts/production-check.mjs <base-url>');
}

const origin = new URL(baseUrl).origin;
const crawlResources = ['/robots.txt', '/sitemap.xml', '/manifest.webmanifest', '/favicon.svg', '/assets/hero.svg', '/assets/social-card.svg'];
const publicRoutes = ['/', '/noticias', '/resultados', '/atletas', '/clubes'];

const request = async (path) => {
  const response = await fetch(new URL(path, origin));
  return { path, response, type: response.headers.get('content-type') || '' };
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

for (const path of publicRoutes) {
  const { response, type } = await request(path);
  assert(response.status === 200 && type.includes('text/html'), `${path}: expected HTML 200, received ${response.status} ${type}`);
}

for (const path of crawlResources) {
  const { response, type } = await request(path);
  assert(response.status === 200 && !type.includes('text/html'), `${path}: expected non-HTML 200, received ${response.status} ${type}`);
}

const home = await request('/');
const html = await home.response.text();
const hashedAsset = html.match(/\/assets\/[^"']+\.(?:js|css)/)?.[0];
assert(hashedAsset, 'Could not find a hashed build asset in the home document');

const asset = await request(hashedAsset);
assert(asset.response.status === 200 && !asset.type.includes('text/html'), `${hashedAsset}: expected non-HTML 200, received ${asset.response.status} ${asset.type}`);

const buildManifest = await request('/build-manifest.json');
assert(buildManifest.response.status === 200 && buildManifest.type.includes('application/json'), `build manifest: expected JSON 200, received ${buildManifest.response.status} ${buildManifest.type}`);
const manifestEntries = Object.values(await buildManifest.response.json());
assert(manifestEntries.some((entry) => entry.dynamicImports?.length), 'build manifest has no independent lazy route chunks');

const missing = await request('/assets/missing-route-proof.12345678.js');
assert(missing.response.status === 404 && !missing.type.includes('text/html'), `missing asset: expected non-HTML 404, received ${missing.response.status} ${missing.type}`);

console.log(`Production routing checks passed for ${origin}`);
