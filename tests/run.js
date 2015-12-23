#!/usr/bin/env node

var testrunner = require('qunit');

testrunner.run({
  code: '../Filters.js',
  tests: './tests.js',
});
