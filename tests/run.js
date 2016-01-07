#!/usr/bin/env node

var testrunner = require('qunit');

testrunner.run({
  code:  '../filters/core.js',
  tests: './tests.js',
}, function(err){
  if (err) {
    console.log("Error:", err.message);
  }
});
