import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { comparePerformance } from './performance-regression.mjs';

const baseUrl = process.argv[2] || process.env.WEB_VITALS_URL || 'https://asanda-web.vercel.app';
const baselinePath = process.argv[3] || process.env.WEB_VITALS_BASELINE;
const outputPath = process.argv[4] || process.env.WEB_VITALS_OUTPUT;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    const metrics = { CLS: 0, LCP: null };
    globalThis.__asandaWebVitals = metrics;
    const supported = globalThis.PerformanceObserver?.supportedEntryTypes ?? [];
    if (supported.includes('layout-shift')) new PerformanceObserver((list) => { metrics.CLS += list.getEntries().reduce((sum, entry) => sum + (entry.hadRecentInput ? 0 : entry.value), 0); }).observe({ type: 'layout-shift', buffered: true });
    if (supported.includes('largest-contentful-paint')) new PerformanceObserver((list) => { metrics.LCP = list.getEntries().at(-1)?.startTime ?? metrics.LCP; }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  await page.goto(new URL('/', baseUrl).href, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const result = await page.evaluate(() => ({ source: 'browser lab Web Vitals', url: location.href, metrics: { CLS: globalThis.__asandaWebVitals?.CLS ?? null, LCP: globalThis.__asandaWebVitals?.LCP ?? null }, unavailableFieldMetrics: ['INP'] }));
  if (outputPath) await writeFile(outputPath, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
  if (baselinePath) {
    const comparison = comparePerformance(result, JSON.parse(await readFile(baselinePath, 'utf8')));
    if (!comparison.ok) { console.error(`Web Vitals baseline regression: ${comparison.regressions.join('; ')}`); process.exitCode = 1; } else console.log('Web Vitals baseline regression check passed.');
  }
} finally {
  await browser.close();
}
