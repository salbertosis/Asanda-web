import { expect, test } from '@playwright/test';

const newsRows = [
  {
    id: '50000000-0000-4000-8000-000000000001',
    slug: 'noticia-publicada',
    title: 'Noticia publicada',
    summary: 'Resumen visible para visitantes.',
    body: '**Cuerpo seguro** con [enlace](https://asanda.org.ve).\nEsta línea continúa el mismo párrafo.\n\n## Desarrollo\n\n### Resultados\n\n> Una cita editorial destacada.\n\nSegundo párrafo editorial.',
    category: 'Competencias',
    publication_status: 'published',
    published_at: '2026-08-18T10:00:00Z',
    updated_at: '2026-08-20T12:30:00Z',
    hero: {
      provider: 'cloudinary',
      public_id: 'asanda/noticias/noticia-publicada',
      external_url: null,
      alt_text: 'Atletas en competencia',
    },
  },
  {
    id: '50000000-0000-4000-8000-000000000002',
    slug: 'noticia-borrador',
    title: 'Noticia borrador privada',
    summary: 'No debe mostrarse.',
    body: 'Privada.',
    category: 'Borrador',
    publication_status: 'draft',
    published_at: null,
    hero: null,
  },
  {
    id: '50000000-0000-4000-8000-000000000003',
    slug: 'noticia-programada',
    title: 'Noticia programada privada',
    summary: 'No debe mostrarse todavía.',
    body: 'Programada.',
    category: 'Programada',
    publication_status: 'published',
    published_at: '2999-01-01T10:00:00Z',
    hero: null,
  },
];

const statsResponse = {
  clubs: 7,
  associatedAthletes: 42,
  federatedAthletes: 18,
  preinfantAthletes: 9,
  asOf: '2026-08-12',
};

const competitionRows = [
  { id: 'c1', slug: 'evento-en-curso', name: 'Evento en curso', starts_on: '2026-08-24', ends_on: '2026-08-26', status: 'in_progress', published_at: '2026-08-01T12:00:00Z', recognition_status: 'recognized', venue: { name: 'Piscina Olímpica', city: 'Barcelona', region: 'Anzoátegui' } },
  { id: 'c2', slug: 'evento-de-hoy', name: 'Evento de hoy', starts_on: '2026-08-26', ends_on: null, status: 'scheduled', published_at: '2026-08-01T12:00:00Z', recognition_status: 'recognized', venue: null },
  { id: 'c3', slug: 'evento-reprogramado', name: 'Evento reprogramado', starts_on: '2026-09-02', ends_on: null, status: 'postponed', published_at: '2026-08-01T12:00:00Z', recognition_status: 'pending', venue: null },
  { id: 'c4', slug: 'fuera-del-limite', name: 'Fuera del límite', starts_on: '2026-10-01', ends_on: null, status: 'scheduled', published_at: '2026-08-01T12:00:00Z', recognition_status: 'recognized', venue: null },
  { id: 'c5', slug: 'evento-pasado', name: 'Evento pasado', starts_on: '2026-08-20', ends_on: '2026-08-25', status: 'scheduled', published_at: '2026-08-01T12:00:00Z', recognition_status: 'recognized', venue: null },
  { id: 'c6', slug: 'evento-cancelado', name: 'Evento cancelado', starts_on: '2026-09-03', ends_on: null, status: 'cancelled', published_at: '2026-08-01T12:00:00Z', recognition_status: 'recognized', venue: null },
  { id: 'c7', slug: 'evento-no-publicado', name: 'Evento no publicado', starts_on: '2026-09-04', ends_on: null, status: 'scheduled', published_at: null, recognition_status: 'recognized', venue: null },
];

const publishedRows = () => newsRows.filter((row) => (
  row.publication_status === 'published' && row.published_at && Date.parse(row.published_at) <= Date.now()
));

const routePublicNews = (page, { competitions = [], competitionStatus = 200, competitionHandler } = {}) => Promise.all([
  page.route('**/rest/v1/news_articles*', (route) => {
    const url = new URL(route.request().url());
    const slugFilter = url.searchParams.get('slug');
    const rows = slugFilter
      ? publishedRows().filter((row) => row.slug === slugFilter.replace(/^eq\./, ''))
      : publishedRows();

    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
  }),
  page.route('**/rest/v1/competitions*', competitionHandler || ((route) => route.fulfill({
    status: competitionStatus,
    contentType: 'application/json',
    body: JSON.stringify(competitions),
  }))),
]);

const fixBrowserDate = (page) => page.addInitScript(() => {
  const NativeDate = Date;
  const fixedNow = '2026-08-26T12:00:00';
  window.Date = class extends NativeDate {
    constructor(...args) { super(...(args.length ? args : [fixedNow])); }
    static now() { return new NativeDate(fixedNow).getTime(); }
  };
});

const routeStats = (page) => page.route('**/rest/v1/rpc/get_homepage_stats', (route) => (
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(statsResponse) })
));

const installShare = (page, outcome = 'success') => page.addInitScript((shareOutcome) => {
  window.__sharePayloads = [];
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    writable: true,
    value: async (payload) => {
      window.__sharePayloads.push(payload);
      if (shareOutcome === 'cancel') throw new DOMException('Share canceled', 'AbortError');
      if (shareOutcome === 'error') throw new DOMException('Share unavailable', 'NotAllowedError');
    },
  });
}, outcome);

test('renders only due published news on the homepage and news list', async ({ page }) => {
  await routeStats(page);
  await routePublicNews(page);

  await page.goto('/');
  const homeNews = page.locator('#noticias');
  await expect(homeNews.getByRole('heading', { name: 'Últimas noticias' })).toBeVisible();
  await expect(homeNews.getByRole('link', { name: 'Noticia publicada' })).toBeVisible();
  await expect(homeNews).not.toContainText('Noticia borrador privada');
  await expect(homeNews).not.toContainText('Noticia programada privada');

  await page.goto('/noticias');
  await expect(page.getByRole('heading', { name: 'Últimas Noticias' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Noticia publicada/ })).toBeVisible();
  await expect(page.getByText('Noticia borrador privada')).toHaveCount(0);
  await expect(page.getByText('Noticia programada privada')).toHaveCount(0);
});

test('opens a published news detail by slug with safe body rendering', async ({ page }) => {
  await routePublicNews(page);

  await page.goto('/noticias/noticia-publicada');

  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1, name: 'Noticia publicada' })).toBeVisible();
  const hero = page.getByTestId('news-detail-hero');
  const heroImage = page.getByAltText('Atletas en competencia');
  await expect(heroImage).toHaveAttribute('src', /asanda\/noticias\/noticia-publicada/);
  await expect(page.getByText('18 de agosto de 2026')).toHaveAttribute('datetime', '2026-08-18T10:00:00Z');
  await expect(page.getByText('20 de agosto de 2026')).toHaveAttribute('datetime', '2026-08-20T12:30:00Z');
  await expect(page.getByText('Redacción ASANDA')).toBeVisible();
  await expect(hero).toBeInViewport();
  await expect(heroImage).toBeInViewport();

  const heroBox = await hero.boundingBox();
  expect(heroBox?.height).toBeLessThan(560);
  await expect(page.getByText('Cuerpo seguro')).toBeVisible();
  await expect(page.getByRole('link', { name: 'enlace' })).toHaveAttribute('href', 'https://asanda.org.ve');

  const articleBody = page.getByTestId('news-article-body');
  await expect(articleBody.locator(':scope > p')).toHaveCount(2);
  await expect(articleBody.locator('p').first()).toContainText('Esta línea continúa el mismo párrafo.');
  await expect(articleBody.locator('br')).toHaveCount(0);
  await expect(articleBody.getByRole('heading', { level: 2, name: 'Desarrollo' })).toBeVisible();
  await expect(articleBody.getByRole('heading', { level: 3, name: 'Resultados' })).toBeVisible();
  await expect(articleBody.locator('blockquote')).toContainText('Una cita editorial destacada.');

const bodyLayout = await articleBody.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    textAlign: getComputedStyle(element).textAlign,
  }));
  // Deriva el límite del mismo valor que usa el CSS (66ch), en vez de un número suelto.
  // Para la fuente efectiva del navegador, 66ch mantiene la columna por debajo de 760px.
  // Si cambia max-w-[66ch] o el font-size del prose, actualizar este comentario y el valor.
  expect(bodyLayout.width).toBeLessThanOrEqual(760);
  expect(bodyLayout.documentWidth).toBeLessThanOrEqual(bodyLayout.viewportWidth);
  expect(bodyLayout.textAlign).toBe('left');
});

test('shows only the next three eligible events after the article on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixBrowserDate(page);
  await routePublicNews(page, { competitions: competitionRows });

  await page.goto('/noticias/noticia-publicada');

  const module = page.getByTestId('upcoming-events');
  await expect(module.getByRole('heading', { name: 'Próximos eventos' })).toBeVisible();
  await expect(module.getByRole('link')).toHaveCount(3);
  await expect(module.getByRole('link', { name: /Evento en curso/ })).toHaveAttribute('href', '/calendario/evento-en-curso');
  await expect(module).toContainText('Piscina Olímpica, Barcelona, Anzoátegui');
  await expect(module).toContainText('Evento de hoy');
  await expect(module).toContainText('Evento reprogramado');
  await expect(module).not.toContainText('Evento pasado');
  await expect(module).not.toContainText('Evento cancelado');
  await expect(module).not.toContainText('Evento no publicado');
  await expect(module).not.toContainText('Fuera del límite');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('keeps the article stable while upcoming events load or fail', async ({ page }) => {
  let releaseResponse;
  const responseGate = new Promise((resolve) => { releaseResponse = resolve; });
  await fixBrowserDate(page);
  await routePublicNews(page, {
    competitionHandler: async (route) => {
      await responseGate;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    },
  });

  await page.goto('/noticias/noticia-publicada');
  await expect(page.getByRole('heading', { level: 1, name: 'Noticia publicada' })).toBeVisible();
  const loading = page.getByRole('status', { name: 'Cargando próximos eventos' });
  await expect(loading).toBeVisible();
  await expect(loading).toHaveAttribute('aria-busy', 'true');
  releaseResponse();
  await expect(page.getByTestId('upcoming-events')).toHaveCount(0);
  await expect(page.getByTestId('news-article-body')).toContainText('Cuerpo seguro');

  await page.unroute('**/rest/v1/competitions*');
  await page.route('**/rest/v1/competitions*', (route) => route.fulfill({ status: 500, body: '{}' }));
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Noticia publicada' })).toBeVisible();
  await expect(page.getByTestId('upcoming-events')).toHaveCount(0);
  await expect(page.getByTestId('news-article-body')).toContainText('Cuerpo seguro');
});

test('reserves the news geometry while loading and transitions without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let releaseResponse;
  const responseGate = new Promise((resolve) => { releaseResponse = resolve; });
  await page.route('**/rest/v1/news_articles*', async (route) => {
    await responseGate;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(publishedRows()) });
  });

  await page.goto('/noticias/noticia-publicada');
  const skeleton = page.getByTestId('news-detail-skeleton');
  await expect(skeleton).toBeVisible();
  await expect(skeleton).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByRole('status')).toContainText('Cargando noticia…');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  releaseResponse();
  await expect(page.getByRole('heading', { level: 1, name: 'Noticia publicada' })).toBeVisible();
  await expect(skeleton).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('shares the normalized article payload through the Web Share API', async ({ page }) => {
  await installShare(page);
  await routePublicNews(page);
  await page.goto('/noticias/noticia-publicada');

  const shareButton = page.getByRole('button', { name: 'Compartir noticia' });
  await expect(shareButton).toBeVisible();
  const buttonBox = await shareButton.boundingBox();
  expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
  expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
  await shareButton.click();

  expect(await page.evaluate(() => window.__sharePayloads)).toEqual([{
    title: 'Noticia publicada',
    text: 'Resumen visible para visitantes.',
    url: 'https://asanda-web.vercel.app/noticias/noticia-publicada',
  }]);
});

test('hides sharing when the Web Share API is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });
  await routePublicNews(page);
  await page.goto('/noticias/noticia-publicada');

  await expect(page.getByRole('heading', { level: 1, name: 'Noticia publicada' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Compartir noticia' })).toHaveCount(0);
});

test('ignores share cancellation and announces real share failures', async ({ page }) => {
  await installShare(page, 'cancel');
  await routePublicNews(page);
  await page.goto('/noticias/noticia-publicada');

  await page.getByRole('button', { name: 'Compartir noticia' }).click();
  await expect(page.getByText('No pudimos abrir las opciones para compartir.')).toHaveCount(0);

  await page.evaluate(() => {
    navigator.share = async () => { throw new DOMException('Share unavailable', 'NotAllowedError'); };
  });
  await page.getByRole('button', { name: 'Compartir noticia' }).click();
  await expect(page.getByRole('status')).toContainText('No pudimos abrir las opciones para compartir. Intentá nuevamente.');
});

test('sets article metadata and restores route metadata after navigation', async ({ page }) => {
  await routePublicNews(page);
  await page.goto('/noticias/noticia-publicada');
  await expect(page).toHaveTitle('Noticia publicada | ASANDA');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://asanda-web.vercel.app/noticias/noticia-publicada');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Resumen visible para visitantes.');
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /asanda\/noticias\/noticia-publicada/);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', /asanda\/noticias\/noticia-publicada/);
  await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute('content', '2026-08-18T10:00:00Z');
  await expect(page.locator('meta[property="article:modified_time"]')).toHaveAttribute('content', '2026-08-20T12:30:00Z');
  const jsonLd = JSON.parse(await page.locator('script[data-route-jsonld]').textContent());
  expect(jsonLd).toMatchObject({ '@type': 'NewsArticle', headline: 'Noticia publicada', datePublished: '2026-08-18T10:00:00Z', dateModified: '2026-08-20T12:30:00Z', author: { name: 'Redacción ASANDA' }, publisher: { name: 'ASANDA' } });
  await page.getByRole('link', { name: 'Volver a noticias' }).click();
  await expect(page).toHaveTitle('Noticias | ASANDA');
  expect(JSON.parse(await page.locator('script[data-route-jsonld]').textContent())['@type']).toBe('WebPage');
});

test('compacts the sticky header after scrolling without shrinking the menu target', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await routePublicNews(page);
  await page.goto('/noticias/noticia-publicada');
  const header = page.getByTestId('site-header');
  await expect(header).toHaveAttribute('data-compact', 'false');
  await expect(page.getByTestId('news-article-body')).toBeVisible();
  await expect(page.getByTestId('upcoming-events')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)).toBeGreaterThanOrEqual(500);
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect(header).toHaveAttribute('data-compact', 'true');
  const menuBox = await page.getByRole('button', { name: 'Abrir menú principal' }).boundingBox();
  expect(menuBox?.height).toBeGreaterThanOrEqual(44);
  const transitionMs = await header.locator('div').first().evaluate((element) => {
    const duration = getComputedStyle(element).transitionDuration.split(',')[0];
    return parseFloat(duration) * (duration.endsWith('ms') ? 1 : 1000);
  });
  expect(transitionMs).toBeLessThanOrEqual(0.01);
});

test('keeps the news detail compact and free of horizontal overflow on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await routePublicNews(page);

  await page.goto('/noticias/noticia-publicada');

  const heroImage = page.getByAltText('Atletas en competencia');
  await expect(page.getByRole('heading', { level: 1, name: 'Noticia publicada' })).toBeVisible();
  await expect(heroImage).toBeVisible();

  const layout = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
});

test('provides a stable not-found state for unpublished or missing news', async ({ page }) => {
  await routePublicNews(page);

  await page.goto('/noticias/noticia-borrador');
  await expect(page.getByRole('heading', { level: 1, name: 'Noticia no encontrada' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Volver a noticias' })).toHaveAttribute('href', '/noticias');

  await page.goto('/noticias/no-existe');
  await expect(page.getByRole('heading', { level: 1, name: 'Noticia no encontrada' })).toBeVisible();
});

test('the document declares Spanish as its language', async ({ page }) => {
  await routePublicNews(page);
  await page.goto('/noticias/noticia-publicada');
  const lang = await page.evaluate(() => document.documentElement.lang);
  expect(lang).toBe('es');
});

test('article headline is never mid-word hyphenated', async ({ page }) => {
  await routePublicNews(page);
  await page.goto('/noticias/noticia-publicada');
  const hyphensValue = await page.locator('h1').evaluate((el) => getComputedStyle(el).hyphens);
  expect(hyphensValue).toBe('none');
});
