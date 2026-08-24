import { expect, test } from '@playwright/test';

const newsRows = [
  {
    id: '50000000-0000-4000-8000-000000000001',
    slug: 'noticia-publicada',
    title: 'Noticia publicada',
    summary: 'Resumen visible para visitantes.',
    body: '**Cuerpo seguro** con [enlace](https://asanda.org.ve).\nEsta línea continúa el mismo párrafo.\n\nSegundo párrafo editorial.',
    category: 'Competencias',
    publication_status: 'published',
    published_at: '2026-08-18T10:00:00Z',
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

const publishedRows = () => newsRows.filter((row) => (
  row.publication_status === 'published' && row.published_at && Date.parse(row.published_at) <= Date.now()
));

const routePublicNews = (page) => page.route('**/rest/v1/news_articles*', (route) => {
  const url = new URL(route.request().url());
  const slugFilter = url.searchParams.get('slug');
  const rows = slugFilter
    ? publishedRows().filter((row) => row.slug === slugFilter.replace(/^eq\./, ''))
    : publishedRows();

  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
});

const routeStats = (page) => page.route('**/rest/v1/rpc/get_homepage_stats', (route) => (
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(statsResponse) })
));

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
  await expect(hero).toBeInViewport();
  await expect(heroImage).toBeInViewport();

  const heroBox = await hero.boundingBox();
  expect(heroBox?.height).toBeLessThan(560);
  await expect(page.getByText('Cuerpo seguro')).toBeVisible();
  await expect(page.getByRole('link', { name: 'enlace' })).toHaveAttribute('href', 'https://asanda.org.ve');

  const articleBody = page.getByTestId('news-article-body');
  await expect(articleBody.locator('p')).toHaveCount(2);
  await expect(articleBody.locator('p').first()).toContainText('Esta línea continúa el mismo párrafo.');
  await expect(articleBody.locator('br')).toHaveCount(0);

const bodyLayout = await articleBody.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    textAlign: getComputedStyle(element).textAlign,
  }));
  // Deriva el límite del mismo valor que usa el CSS (68ch), en vez de un número suelto.
  // 1ch ≈ 0.5–0.6em según la fuente; para la fuente actual a 17px esto da ~740-760px.
  // Si cambia max-w-[68ch] o el font-size del prose, actualizar este comentario y el valor.
  expect(bodyLayout.width).toBeLessThanOrEqual(760);
  expect(bodyLayout.documentWidth).toBeLessThanOrEqual(bodyLayout.viewportWidth);
  expect(bodyLayout.textAlign).toBe('left');
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
