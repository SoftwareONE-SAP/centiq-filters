Package.describe({
  name: 'centiq:filters',
  version: '0.0.1',
  summary: 'Library for managing collection filtering',
  git: 'https://github.com/Centiq/centiq-filters',
  documentation: 'README.md'
});

Npm.depends({
  util: '0.10.3',
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.3');

  api.use([
    'ejson',
  ]);

  api.addFiles([
    'Filter.js',
    'filters/core.js',
  ]);

  api.export([
    'Filter',
  ]);
});
