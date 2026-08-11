module.exports = {
  ci: {
    collect: { startServerCommand: 'npm run preview -- --host 127.0.0.1 --port 4174', startServerReadyPattern: 'Local:', url: ['http://127.0.0.1:4174/', 'http://127.0.0.1:4174/resultados'], numberOfRuns: 1 },
    assert: { assertions: { 'categories:performance': ['error', { minScore: 0.8 }], 'categories:accessibility': ['error', { minScore: 0.9 }], 'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }], 'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }] } },
    upload: { target: 'filesystem', outputDir: './.lighthouseci' },
  },
};
