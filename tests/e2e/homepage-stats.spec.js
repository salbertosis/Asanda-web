import { expect, test } from '@playwright/test';

const statsResponse = {
  clubs: 7,
  associatedAthletes: 42,
  federatedAthletes: 18,
  preinfantAthletes: 9,
  asOf: '2026-08-12',
};

const routeStats = (page, response = statsResponse, status = 200) => page.route('**/rest/v1/rpc/get_homepage_stats', (route) => (
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response) })
));

test('renders live homepage statistics from the aggregate endpoint', async ({ page }) => {
  await routeStats(page);
  await page.goto('/');

  const stats = page.getByLabel('Estadísticas principales');
  await expect(stats).toContainText('9');
  await expect(stats).toContainText('42');
  await expect(stats).toContainText('18');
  await expect(stats).toContainText('7');
  await expect(stats).toContainText('Fuente: registro ASANDA');
  await expect(stats).not.toContainText('32.625.806');
  await expect(stats).not.toContainText('Gustavo Idrogo');
});

test('keeps four reserved cards while homepage statistics load', async ({ page }) => {
  let releaseResponse;
  const responseGate = new Promise((resolve) => { releaseResponse = resolve; });
  await page.route('**/rest/v1/rpc/get_homepage_stats', async (route) => {
    await responseGate;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(statsResponse) });
  });

  await page.goto('/');
  const stats = page.getByLabel('Estadísticas principales');
  await expect(stats.getByRole('link')).toHaveCount(4);
  await expect(stats).toHaveAttribute('aria-busy', 'true');
  await expect(stats.getByRole('status')).toContainText('Cargando estadísticas');
  releaseResponse();
  await expect(stats).toHaveAttribute('aria-busy', 'false');
});

test('shows unavailable placeholders instead of false zeroes on stats failure', async ({ page }) => {
  await routeStats(page, { message: 'Unavailable' }, 500);
  await page.goto('/');

  const stats = page.getByLabel('Estadísticas principales');
  await expect(stats.getByRole('status')).toContainText('Estadísticas no disponibles');
  await expect(stats.getByText('—')).toHaveCount(4);
});

test('keeps the redesigned homepage within a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await routeStats(page);
  await page.goto('/');

  await expect(page.getByText('Portal oficial de deportes acuáticos')).toBeVisible();
  await expect(page.getByText('Anzoátegui · Venezuela')).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByLabel('Estadísticas principales')).toBeVisible();
  const layout = await page.evaluate(() => {
    const title = document.querySelector('#home-title').getBoundingClientRect();
    return {
      pageWidth: document.documentElement.scrollWidth,
      titleLeft: title.left,
      titleRight: title.right,
    };
  });
  expect(layout.pageWidth).toBeLessThanOrEqual(320);
  expect(layout.titleLeft).toBeGreaterThanOrEqual(0);
  expect(layout.titleRight).toBeLessThanOrEqual(320);
});

test('keeps the sponsor slot below the first content section', async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 900 });
  await routeStats(page);
  await page.goto('/');

  const hero = page.locator('section[aria-labelledby="home-title"]');
  await expect(hero.getByRole('complementary')).toHaveCount(0);

  const sponsor = page.locator('main').getByRole('complementary').first();
  await expect(sponsor).toBeVisible();
  const sponsorBox = await sponsor.boundingBox();
  const newsBox = await page.locator('main').getByRole('heading', { name: /noticias/i }).first().boundingBox();
  expect(sponsorBox.y).toBeGreaterThan(newsBox.y);
});

test('keeps the primary CTA above the fold on a standard mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await routeStats(page);
  await page.goto('/');

  const cta = page.getByRole('link', { name: 'Ver resultados' });
  await expect(cta).toBeVisible();
  const box = await cta.boundingBox();
  expect(box.y + box.height).toBeLessThanOrEqual(844);
});

test('uses the new ASANDA turquoise, green, blue and orange palette', async ({ page }) => {
  await routeStats(page);
  await page.goto('/');

  const hero = page.locator('section[aria-labelledby="home-title"]');
  const palette = await hero.evaluate((section) => {
    const background = section.querySelector('[aria-hidden="true"]');
    const titlePanel = section.querySelector('#home-title').parentElement;
    const primaryCta = section.querySelector('a[href="/resultados"]');
    const secondaryCta = section.querySelector('a[href="/calendario"]');
    const stats = section.querySelector('[aria-label="Estadísticas principales"]');
    const statsHeader = stats.firstElementChild;
    const statsCard = stats.querySelector('a');
    const statsCards = Array.from(stats.querySelectorAll('a'));
    const statsIcon = statsCard.querySelector('span');
    const statsNumber = statsCard.querySelector('strong');
    const statsLabel = statsNumber.nextElementSibling;
    return {
      background: getComputedStyle(background).backgroundColor,
      heroHasGradient: Array.from(background.children).some((child) => getComputedStyle(child).backgroundImage.includes('linear-gradient')),
      panel: getComputedStyle(titlePanel).backgroundColor,
      ctaBackground: getComputedStyle(primaryCta).backgroundColor,
      ctaText: getComputedStyle(primaryCta).color,
      secondaryCtaBackground: getComputedStyle(secondaryCta).backgroundColor,
      statsBackground: getComputedStyle(stats).backgroundColor,
      statsHeaderBackground: getComputedStyle(statsHeader).backgroundColor,
      statsLabelColor: getComputedStyle(statsHeader.firstElementChild).color,
      statsCardBackground: getComputedStyle(statsCard).backgroundColor,
      statsCardBorder: getComputedStyle(statsCard).borderRightColor,
      statsCardTopBorders: statsCards.map((card) => getComputedStyle(card).borderTopColor),
      statsCardTopWidth: getComputedStyle(statsCard).borderTopWidth,
      statsCardRadius: getComputedStyle(statsCard).borderRadius,
      statsIconBackground: getComputedStyle(statsIcon).backgroundColor,
      statsNumberColor: getComputedStyle(statsNumber).color,
      statsNumberSize: getComputedStyle(statsNumber).fontSize,
      statsLabelSize: getComputedStyle(statsLabel).fontSize,
      statsLabelTracking: getComputedStyle(statsLabel).letterSpacing,
    };
  });

  expect(palette).toEqual({
    background: 'rgb(10, 175, 181)',
    heroHasGradient: false,
    panel: 'rgb(8, 127, 132)',
    ctaBackground: 'rgb(189, 79, 39)',
    ctaText: 'rgb(255, 255, 255)',
    secondaryCtaBackground: 'rgba(255, 255, 255, 0.05)',
    statsBackground: 'rgb(232, 245, 241)',
    statsHeaderBackground: 'rgb(232, 245, 241)',
    statsLabelColor: 'rgb(15, 110, 104)',
    statsCardBackground: 'rgb(255, 255, 255)',
    statsCardBorder: 'rgb(211, 233, 234)',
    statsCardTopBorders: ['rgb(10, 175, 181)', 'rgb(24, 199, 161)', 'rgb(115, 201, 71)', 'rgb(201, 88, 45)'],
    statsCardTopWidth: '4px',
    statsCardRadius: '14px',
    statsIconBackground: 'rgb(236, 254, 255)',
    statsNumberColor: 'rgb(11, 37, 48)',
    statsNumberSize: '44px',
    statsLabelSize: '12px',
    statsLabelTracking: '0.96px',
  });

  const headerPalette = await page.locator('header').evaluate((header) => {
    const topBar = header.children[0];
    const topBarContent = topBar.firstElementChild;
    const navigation = header.children[1];
    return {
      topBar: getComputedStyle(topBar).backgroundColor,
      topBarText: getComputedStyle(topBar).color,
      topBarSize: getComputedStyle(topBarContent).fontSize,
      topBarWeight: getComputedStyle(topBarContent).fontWeight,
      topBarTracking: getComputedStyle(topBarContent).letterSpacing,
      navigation: getComputedStyle(navigation).backgroundColor,
      accent: getComputedStyle(navigation).borderBottomColor,
    };
  });
  expect(headerPalette.topBar).toBe('rgb(226, 97, 45)');
  expect(headerPalette.topBarText).toBe('rgb(11, 37, 48)');
  expect(headerPalette.topBarSize).toBe('13px');
  expect(headerPalette.topBarWeight).toBe('700');
  expect(headerPalette.topBarTracking).toBe('0.52px');
  expect(headerPalette.navigation).toBe('rgb(232, 245, 241)');
  expect(headerPalette.accent).toBe('rgb(201, 88, 45)');

  const topBarLabelsAreTransparent = await page.locator('header > div').first().locator('span').evaluateAll((labels) =>
    labels.every((label) => getComputedStyle(label).backgroundColor === 'rgba(0, 0, 0, 0)')
  );
  expect(topBarLabelsAreTransparent).toBe(true);

  const sportsMenu = page.getByRole('button', { name: 'Deportes', exact: true });
  await sportsMenu.hover();
  await expect.poll(() => sportsMenu.evaluate((button) => getComputedStyle(button).backgroundColor)).toBe('rgb(238, 243, 255)');
});

test('does not request homepage stats in isolated advertising preview', async ({ page }) => {
  let calls = 0;
  await page.route('**/rest/v1/rpc/get_homepage_stats', (route) => {
    calls += 1;
    return route.abort();
  });
  await page.goto('/?ads=demo');
  await expect(page.getByRole('heading', { name: 'Vista previa de publicidad demo' })).toBeVisible();
  expect(calls).toBe(0);
});
