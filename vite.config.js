import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const missingStaticAssetsAreNotSpaRoutes = () => {
  const rejectMissingAsset = (request, response, next) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (!pathname.startsWith('/assets/')) return next();

    const staticAsset = resolve('public', pathname.slice(1));
    if (existsSync(staticAsset)) return next();

    response.statusCode = 404;
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end('Not found');
  };

  return {
    name: 'missing-static-assets-are-not-spa-routes',
    configureServer(server) {
      server.middlewares.use(rejectMissingAsset);
    },
  };
};

export default defineConfig({
  plugins: [
    react(),
    missingStaticAssetsAreNotSpaRoutes(),
  ],
  build: { manifest: 'build-manifest.json' },
})


