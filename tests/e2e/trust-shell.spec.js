import { expect, test } from '@playwright/test';
import { validatePublicSite } from '../../src/config/publicSite.js';
import { getApprovedLegalContent, isValidLegalContent } from '../../src/content/legalContent.js';

const approvedFixture = {
  canonicalOrigin: 'https://asanda.org.ve', canonicalOriginApproved: true,
  identity: { value: 'ASANDA', approved: true }, copyright: { notice: 'ASANDA 2026', approved: true },
  social: [{ label: 'Instagram', href: 'https://instagram.com/asanda', approved: true }],
  legal: { legalApproved: true, privacyApproved: true }, criticalAssets: ['/asanda.png', '/favicon.svg'],
};

const injectApprovedPublicSite = (page) => page.route('**/src/config/publicSite.js', async (route) => {
  const response = await route.fetch();
  const source = await response.text();
  const injected = source.replace(/const publicSite = \{[\s\S]*?\n\};/, `const publicSite = ${JSON.stringify(approvedFixture)};`);
  expect(injected).not.toBe(source);
  await route.fulfill({ response, body: injected });
});

test('accepts approved fixtures and rejects unsafe public facts', () => {
  expect(validatePublicSite(approvedFixture)).toEqual({ issues: [], safeSite: approvedFixture });
  const result = validatePublicSite({ ...approvedFixture, canonicalOrigin: 'http://asanda.example.ve', identity: { value: 'ASANDA placeholder', approved: true }, copyright: { notice: 'Copyright placeholder', approved: true }, social: [{ href: 'https://facebook.com', approved: true }], legal: { legalApproved: false, privacyApproved: false }, criticalAssets: ['https://cdn.example.org/logo.svg', '//cdn.example.org/logo.svg'] });
  expect(result.safeSite).toMatchObject({ canonicalOrigin: null, identity: null, copyright: null, social: [], criticalAssets: [], legal: { legalApproved: false, privacyApproved: false } });
  expect(result.issues).toEqual(expect.arrayContaining(['canonicalOrigin', 'identity', 'copyright', 'social', 'criticalAssets', 'legal']));
});

test('normalizes a trailing-slash canonical origin so same-origin assets compare identically', () => {
  const result = validatePublicSite({ ...approvedFixture, canonicalOrigin: 'https://asanda.org.ve/' });
  expect(result.issues).toEqual([]);
  expect(result.safeSite.canonicalOrigin).toBe('https://asanda.org.ve');
  expect(result.safeSite.canonicalOriginApproved).toBe(true);
  expect(result.safeSite.criticalAssets).toEqual(approvedFixture.criticalAssets);
});

test('rejects cross-origin critical assets without invalidating the canonical origin', () => {
  const result = validatePublicSite({
    ...approvedFixture,
    criticalAssets: ['/asanda.png', 'https://cdn.example.org/logo.svg'],
  });
  expect(result.issues).toEqual(['criticalAssets']);
  expect(result.safeSite.canonicalOrigin).toBe(approvedFixture.canonicalOrigin);
  expect(result.safeSite.criticalAssets).toEqual(['/asanda.png']);
});

test('fails closed for malformed config, placeholder origins, and URL credentials', () => {
  const malformed = [null, { ...approvedFixture, social: {} }, { ...approvedFixture, criticalAssets: {} }, { ...approvedFixture, canonicalOrigin: 'https://asanda.example.ve' }, { ...approvedFixture, canonicalOrigin: 'https://user:secret@asanda.org.ve' }, { ...approvedFixture, criticalAssets: ['https://user:secret@asanda.org.ve/logo.svg'] }];
  for (const site of malformed) { expect(() => validatePublicSite(site)).not.toThrow(); const result = validatePublicSite(site); expect(Array.isArray(result.safeSite.social)).toBe(true); expect(Array.isArray(result.safeSite.criticalAssets)).toBe(true); }
  expect(validatePublicSite({ ...approvedFixture, social: {} }).safeSite.social).toEqual([]);
  expect(validatePublicSite({ ...approvedFixture, criticalAssets: {} }).safeSite.criticalAssets).toEqual([]);
  expect(validatePublicSite({ ...approvedFixture, canonicalOrigin: 'https://asanda.example.ve' }).safeSite.canonicalOrigin).toBeNull();
  expect(validatePublicSite({ ...approvedFixture, canonicalOrigin: 'https://user:secret@asanda.org.ve' }).safeSite.canonicalOrigin).toBeNull();
  expect(validatePublicSite({ ...approvedFixture, criticalAssets: ['https://user:secret@asanda.org.ve/logo.svg'] }).safeSite.criticalAssets).toEqual([]);
});

test('requires literal approval and structurally valid legal content', () => {
  const result = validatePublicSite({ ...approvedFixture, canonicalOriginApproved: 'true', identity: { value: 'ASANDA', approved: 'true' }, copyright: { notice: 'ASANDA 2026', approved: 'true' }, social: [{ href: 'https://instagram.com/asanda', approved: 'true' }], legal: { legalApproved: 'true', privacyApproved: 'true' } });
  expect(result.safeSite).toMatchObject({ canonicalOrigin: null, identity: null, copyright: null, social: [], canonicalOriginApproved: false, legal: { legalApproved: false, privacyApproved: false } });
  expect(result.issues).toEqual(expect.arrayContaining(['canonicalOrigin', 'identity', 'copyright', 'social', 'criticalAssets', 'legal']));
  const valid = { approved: true, title: 'Aviso legal', sections: [{ heading: 'Alcance', body: 'Texto aprobado.' }] };
  expect(isValidLegalContent(valid)).toBe(true); expect(getApprovedLegalContent('legal', { legal: valid })).toEqual(valid);
  for (const content of [null, { ...valid, approved: 'true' }, { ...valid, title: ' ' }, { ...valid, sections: [] }, { ...valid, sections: {} }, { ...valid, sections: [{ heading: '', body: 'Texto' }] }, { ...valid, sections: [null] }]) expect(isValidLegalContent(content)).toBe(false);
});

test('renders approved legal and privacy content without placeholder institutional values', async ({ page }) => {
  const approvedLegal = getApprovedLegalContent('legal'); const approvedPrivacy = getApprovedLegalContent('privacy');
  expect(approvedLegal?.approved).toBe(true); expect(approvedPrivacy?.approved).toBe(true);
  await page.goto('/legal'); await expect(page.getByRole('main')).toHaveCount(1); await expect(page.getByRole('heading', { name: 'Información legal' })).toBeVisible();
  await expect(page.getByText(approvedLegal.sections[0].body, { exact: true })).toBeVisible();
  await page.goto('/privacidad'); await expect(page.getByRole('main')).toHaveCount(1); await expect(page.getByRole('heading', { name: 'Privacidad' })).toBeVisible();
  await expect(page.getByText(approvedPrivacy.sections[0].body, { exact: true })).toBeVisible(); await page.goto('/');
  await expect(page.getByText('© 2026 Asociación de Deportes Acuáticos del Estado Anzoátegui (ASANDA). Todos los derechos reservados')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Seguir a ASANDA en Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/asandaanzoategui/');
  await expect(page.getByRole('link', { name: 'Contactar a ASANDA por WhatsApp' })).toHaveAttribute('href', 'https://wa.me/5804124090715');
  for (const heading of ['Deportes', 'Enlaces']) await expect(page.getByRole('contentinfo').getByRole('heading', { name: heading })).toHaveCount(0);
  for (const value of ['Copyright 2025 - Natación Estadal. Todos los derechos reservados.', 'info@natacionestadal.com', '+58 212 123 4567']) await expect(page.getByText(value)).toHaveCount(0);
});

test('renders approved fixture values in the footer', async ({ page }) => {
  await injectApprovedPublicSite(page);
  await page.goto('/');
  await expect(page.getByText(approvedFixture.copyright.notice)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Legal', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Privacidad', exact: true })).toBeVisible();
});

const navigateClientSide = (page, path) => page.evaluate((nextPath) => { window.history.pushState({}, '', nextPath); window.dispatchEvent(new PopStateEvent('popstate')); }, path);

test('restores prior title and robots metadata, removing only owned metadata', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { document.title = 'Previous title'; const robots = document.createElement('meta'); robots.id = 'pre-existing-robots'; robots.name = 'robots'; robots.content = 'index,follow'; document.head.appendChild(robots); });
  await navigateClientSide(page, '/legal'); await expect(page).toHaveTitle('Información legal | ASANDA'); await expect(page.locator('#pre-existing-robots')).toHaveAttribute('content', 'noindex,nofollow');
  await navigateClientSide(page, '/'); await expect(page).toHaveTitle('Previous title'); await expect(page.locator('#pre-existing-robots')).toHaveAttribute('content', 'index,follow');
  await page.evaluate(() => { document.querySelector('meta[name="robots"]')?.remove(); document.title = 'Another title'; });
  await navigateClientSide(page, '/legal'); await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
  await navigateClientSide(page, '/'); await expect(page).toHaveTitle('Another title'); await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test('uses one approved origin for route metadata and scopes demo noindex', async ({ page }) => {
  await injectApprovedPublicSite(page);
  await page.goto('/resultados');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://asanda.org.ve/resultados');
  for (const selector of ['meta[property="og:url"]', 'meta[property="og:image"]', 'meta[name="twitter:image"]']) await expect(page.locator(selector)).toHaveAttribute('content', /^(https:\/\/asanda\.org\.ve)/);
  const jsonLd = JSON.parse(await page.locator('script[data-route-jsonld]').textContent());
  expect(jsonLd.url).toBe('https://asanda.org.ve/resultados');
  expect(jsonLd.image).toBe('https://asanda.org.ve/assets/social-card.svg');
  for (const url of ['/?ads=demo', '/publicidad/demo/aquaflow-demo']) { await page.goto(url); await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow'); }
  await page.goto('/'); await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});
