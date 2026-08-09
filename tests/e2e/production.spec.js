import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('declares filesystem-first routing before the SPA fallback', async () => {
  const config = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const routes = config.routes;

  expect(routes[0]).toEqual({ handle: 'filesystem' });
  expect(routes).toContainEqual({ src: '/(.*\\..*)', status: 404 });
  expect(routes.at(-1)).toEqual({ src: '/(.*)', dest: '/index.html' });
});
