const baseUrl = (process.env.LIGHTHOUSE_URL || 'http://127.0.0.1:4174').replace(/\/$/, '');
const collectLocalPreview = !process.env.LIGHTHOUSE_URL;

module.exports = {
  ci: {
    collect: { ...(collectLocalPreview ? { startServerCommand: 'npm run preview -- --host 127.0.0.1 --port 4174', startServerReadyPattern: 'Local', startServerReadyTimeout: 120000 } : {}), url: [`${baseUrl}/`, `${baseUrl}/resultados`], numberOfRuns: 3 },
    assert: { assertions: { 'categories:performance': ['error', { minScore: 0.8, aggregationMethod: 'median' }], 'categories:accessibility': ['error', { minScore: 0.9, aggregationMethod: 'median' }], 'largest-contentful-paint': ['warn', { maxNumericValue: 2500, aggregationMethod: 'median' }], 'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1, aggregationMethod: 'median' }] } },
    upload: { target: 'filesystem', outputDir: './.lighthouseci' },
  },
};
