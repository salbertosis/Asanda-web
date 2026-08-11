import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { publicSite, toPublicUrl, validatePublicSite } from '../src/config/publicSite.js';
import { getIndexableRoutes } from '../src/seo/routeMetadata.js';

// Generate crawl assets from validated configuration; omit sitemap locations without approval.
export function createPublicAssets(site = publicSite) {
  const validation = validatePublicSite(site);
  const origin = validation.safeSite.canonicalOrigin;
  const urls = origin ? getIndexableRoutes().map((path) => toPublicUrl(path, origin)) : [];
  return {
    validationIssues: validation.issues,
    robots: ['User-agent: *', 'Allow: /', origin && `Sitemap: ${origin}/sitemap.xml`].filter(Boolean).join('\n') + '\n',
    sitemap: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${url}</loc></url>`).join('')}</urlset>\n`,
    manifest: { name: 'ASANDA', short_name: 'ASANDA', display: 'standalone', start_url: '/', icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }] },
  };
}

export async function generatePublicAssets() {
  const assets = createPublicAssets();
  if (process.argv.includes('--check') && assets.validationIssues.length) throw new Error(`Unapproved public-site configuration: ${assets.validationIssues.join(', ')}`);
  await mkdir(resolve('public'), { recursive: true });
  await Promise.all([['robots.txt', assets.robots], ['sitemap.xml', assets.sitemap], ['manifest.webmanifest', `${JSON.stringify(assets.manifest, null, 2)}\n`]].map(([name, content]) => writeFile(resolve('public', name), content)));
  return assets;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) generatePublicAssets().catch((error) => { console.error(error.message); process.exitCode = 1; });
