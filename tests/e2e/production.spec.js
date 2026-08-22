import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('declares ordered security, filesystem, and SPA fallback routes', async () => {
  const config = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const routes = config.routes;

  expect(config).not.toHaveProperty('headers');
  expect(routes[0]).toEqual({ src: '/(.*)', headers: { 'Content-Security-Policy-Report-Only': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' https: data:; connect-src 'self' https://fuxlohqricsfsxkjztne.supabase.co wss://fuxlohqricsfsxkjztne.supabase.co; base-uri 'self'; form-action 'self'; frame-ancestors 'none'", 'Permissions-Policy': 'camera=(), geolocation=(), microphone=()', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' }, continue: true });
  expect(routes[1]).toEqual({
    src: '/20260813/(.*)',
    headers: {
      'Content-Security-Policy': "frame-ancestors 'self';",
      'X-Frame-Options': 'SAMEORIGIN',
    },
    continue: true,
  });
  expect(routes[2]).toEqual({ handle: 'filesystem' });
  expect(routes).toContainEqual({ src: '/(.*\\..*)', status: 404 });
  expect(routes.at(-1)).toEqual({ src: '/(.*)', dest: '/index.html' });
});
