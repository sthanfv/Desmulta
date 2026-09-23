// Lighthouse contra la web publicada (workflow semanal .github/workflows/lighthouse.yml).
// Los umbrales avisan (warn) en vez de fallar: el puntaje de rendimiento varía entre corridas
// por la red de GitHub; el objetivo es seguir la tendencia con el informe público enlazado.
module.exports = {
  ci: {
    collect: {
      url: ['https://desmulta.online/'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.85 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
