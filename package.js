Package.describe({
  name: 'centiq:filters',
  version: '1.0.0',
  summary: 'Library for managing collection filtering',
  git: 'https://github.com/Centiq/centiq-filters',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.3');

  api.use([
    'ejson',
    'tracker',
  ]);

  api.addFiles([
    'Filter.js',
    'filters/core.js',
  ]);

  api.export([
    'Filter',
  ]);
});
