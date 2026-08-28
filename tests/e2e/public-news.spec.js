import { expect, test } from '@playwright/test';

const newsRows = [
  {
    id: '50000000-0000-4000-8000-000000000004',
    slug: 'noticia-mas-reciente',
    title: 'Noticia más reciente',
    summary: 'La actualidad más reciente de ASANDA.',
    body: 'Contenido de la noticia más reciente.',
    category: 'Actualidad',
    publication_status: 'published',
    published_at: '2026-08-22T10:00:00Z',
    updated_at: null,
    hero: {
      provider: 'cloudinary',
      public_id: 'asanda/noticias/noticia-reciente',
      external_url: null,
      alt_text: 'Nadadores durante un encuentro regional',
    },
  },
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

const withCalendar = (competition) => ({ ...competition, calendar: { season_year: Number(competition.starts_on.slice(0, 4)), discipline: { id: 'discipline-1', code: 'swimming', name: 'Natación', sort_order: 10 } } });
const competitionRows = [
  { id: 'c1', slug: 'evento-en-curso', name: 'Evento en curso', starts_on: '2026-08-24', ends_on: '2026-08-26', status: 'in_progress', published_at: '2026-08-01T12:00:00Z', recognition_status: 'recognized', venue: { name: 'Piscina Olímpica', city: 'Barcelona', region: 'Anzoátegui' } },
  { id: 'c2', slug: 'evento-de-hoy', name: 'Evento de hoy', starts_on: '2026-08-26', ends_on: null, status: 'scheduled', published_at: '2026-08-01T12:00:00Z', recognition_status: 'recognized', venue: null },
  { id: 'c3', slug: 'evento-reprogramado', name: 'Evento reprogramado', starts_on: '2026-09-02', ends_on: null, status: 'postponed', published_at: '2026-08-01T12:00:00Z', recognition_status: 'pending', venue: null },
  { id: 'c4', slug: 'fuera-del-limite', name: 'Fuera del límite', starts_on: '2026-10-01', ends_on: null, status: 'scheduled', published_at: '2026-08-01T12:00:00Z', recognition_status: 'recognized', venue: null },
  { id: 'c5', slug: 'evento-pasado', name: 'Evento pasado', starts_on: '2026-08-20', ends_on: '2026-08-25', status: 'scheduled', published_at: '2026-08-01T12:00:00Z', recognition_status: 'recognized', venue: null },
  { id: 'c6', slug: 'evento-cancelado', name: 'Evento cancelado', starts_on: '2026-09-03', ends_on: null, status: 'cancelled', published_at: '2026-08-01T12:00:00Z', recognition_status: 'recognized', venue: null },
  { id: 'c7', slug: 'evento-no-publicado', name: 'Evento no publicado', starts_on: '2026-09-04', ends_on: null, status: 'scheduled', published_at: null, recognition_status: 'recognized', venue: null },
].map(withCalendar);

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
  page.route('**/rest/v1/competitions*', competitionHandler || ((route) => {
    expect(new URL(route.request().url()).searchParams.get('select')).toContain('calendar:competition_calendars!inner');
    return route.fulfill({ status: competitionStatus, contentType: 'application/json', body: JSON.stringify(competitions) });
  })),
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
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1, name: 'Noticias' })).toBeVisible();
  const featuredNews = page.getByTestId('featured-news');
  await expect(featuredNews.getByRole('link', { name: 'Noticia más reciente' })).toBeVisible();
  await expect(featuredNews.locator('time')).toHaveAttribute('datetime', '2026-08-22T10:00:00Z');
  await expect(page.locator('#noticias').getByRole('link', { name: 'Ver todas' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Noticia publicada/ })).toBeVisible();
  await expect(page.locator('#noticias time[datetime]')).toHaveCount(2);
  await expect(page.getByText('Noticia borrador privada')).toHaveCount(0);
  await expect(page.getByText('Noticia programada privada')).toHaveCount(0);

  await featuredNews.getByRole('link', { name: 'Noticia más reciente' }).click();
  await expect(page).toHaveURL(/\/noticias\/noticia-mas-reciente$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Noticia más reciente' })).toBeVisible();
});

test('uses automatic Cloudinary gravity and reserves a 16:9 homepage image', async ({ page }) => {
  await routeStats(page);
  await routePublicNews(page);

  await page.goto('/');
  const image = page.locator('#noticias').getByRole('img', { name: 'Nadadores durante un encuentro regional' });
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('src', /\/w_800,h_450,c_fill,g_auto,q_auto,f_auto\//);

  const mediaRatio = await image.locator('..').evaluate((element) => {
    const { width, height } = element.getBoundingClientRect();
    return width / height;
  });
  expect(mediaRatio).toBeCloseTo(16 / 9, 2);
});

test('keeps the news archive free of horizontal overflow on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await routePublicNews(page);

  await page.goto('/noticias');

  await expect(page.getByTestId('featured-news')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Noticia publicada' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
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
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(publishedRows().filter((row) => row.slug === 'noticia-publicada')),
    });
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

test('keeps the sticky header compact after crossing the scroll threshold', async ({ page }) => {
  await routePublicNews(page);
  await page.goto('/noticias/noticia-publicada');

  const header = page.getByTestId('site-header');
  await expect(header).toHaveAttribute('data-compact', 'false');
  await expect(page.getByTestId('news-article-body')).toBeVisible();
  await expect(page.getByTestId('upcoming-events')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)).toBeGreaterThanOrEqual(500);

  const result = await page.evaluate(async () => {
    const siteHeader = document.querySelector('[data-testid="site-header"]');
    const headerSpacer = document.querySelector('[data-testid="site-header-spacer"]');
    document.documentElement.style.scrollBehavior = 'auto';
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const sample = () => ({
      compact: siteHeader.dataset.compact,
      scrollHeight: document.documentElement.scrollHeight,
      scrollY: window.scrollY,
    });

    await document.fonts.ready;
    window.scrollTo(0, 0);
    await nextFrame();
    const initial = {
      headerHeight: siteHeader.getBoundingClientRect().height,
      spacerHeight: headerSpacer.getBoundingClientRect().height,
      scrollHeight: document.documentElement.scrollHeight,
    };
    const samples = [];

    for (let scrollTop = 8; scrollTop <= 16; scrollTop += 1) {
      window.scrollTo(0, scrollTop);
      await nextFrame();
      samples.push(sample());
    }

    for (let frame = 0; frame < 36; frame += 1) {
      await nextFrame();
      samples.push(sample());
    }

    return {
      initial,
      samples,
      spacerTop: headerSpacer.getBoundingClientRect().top,
    };
  });

  const compactIndex = result.samples.findIndex(({ compact }) => compact === 'true');
  const settledScrollSamples = result.samples.slice(9).map(({ scrollY }) => scrollY);
  expect(compactIndex).toBeGreaterThanOrEqual(0);
  expect(result.samples.slice(compactIndex).every(({ compact }) => compact === 'true')).toBe(true);
  expect(Math.min(...result.samples.slice(compactIndex).map(({ scrollY }) => scrollY))).toBeGreaterThan(12);
  expect(Math.max(...settledScrollSamples) - Math.min(...settledScrollSamples)).toBeLessThanOrEqual(0.5);
  expect(settledScrollSamples[0]).toBeGreaterThanOrEqual(16);
  expect(result.samples.every(({ scrollHeight }) => scrollHeight === result.initial.scrollHeight)).toBe(true);
  expect(result.initial.headerHeight).toBe(116);
  expect(result.initial.spacerHeight).toBe(result.initial.headerHeight);
  expect(result.spacerTop).toBeLessThan(0);

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(header).toHaveAttribute('data-compact', 'false');
  await expect.poll(() => header.evaluate((element) => element.getBoundingClientRect().height)).toBe(116);
});

test('compacts the sticky header with reduced motion without shrinking the mobile menu target', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await routePublicNews(page);
  await page.goto('/noticias/noticia-publicada');
  const header = page.getByTestId('site-header');
  const spacer = page.getByTestId('site-header-spacer');
  await expect(header).toHaveAttribute('data-compact', 'false');
  expect(await header.evaluate((element) => element.getBoundingClientRect().height)).toBe(108);
  expect(await spacer.evaluate((element) => element.getBoundingClientRect().height)).toBe(108);
  await expect(page.getByTestId('news-article-body')).toBeVisible();
  await expect(page.getByTestId('upcoming-events')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)).toBeGreaterThanOrEqual(500);
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect(header).toHaveAttribute('data-compact', 'true');
  expect(await header.evaluate((element) => element.getBoundingClientRect().height)).toBe(68);
  const menuButton = page.getByRole('button', { name: 'Abrir menú principal' });
  const menuBox = await menuButton.boundingBox();
  expect(menuBox?.height).toBeGreaterThanOrEqual(44);
  const transitionMs = await header.locator('div').first().evaluate((element) => {
    const duration = getComputedStyle(element).transitionDuration.split(',')[0];
    return parseFloat(duration) * (duration.endsWith('ms') ? 1 : 1000);
  });
  expect(transitionMs).toBeLessThanOrEqual(0.01);
  await menuButton.click();
  await expect(page.getByRole('navigation', { name: 'Navegación móvil' })).toBeVisible();
  expect(await page.locator('body').evaluate((element) => element.style.overflow)).toBe('hidden');
  await page.getByRole('button', { name: 'Cerrar menú principal' }).click();
  expect(await page.locator('body').evaluate((element) => element.style.overflow)).toBe('');
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
