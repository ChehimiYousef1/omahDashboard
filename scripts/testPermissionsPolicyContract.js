'use strict';

const fs = require('fs');
const path = require('path');

const root =
  path.resolve(__dirname, '..');

const middlewarePath =
  path.join(
    root,
    'src',
    'bootstrap',
    'configureMiddleware.js'
  );

const source =
  fs.readFileSync(
    middlewarePath,
    'utf8'
  );

const required = [
  "'Permissions-Policy'",
  "'camera=(), microphone=(), geolocation=(), payment=(), usb=()'",
  'if (isProduction)',
];

for (const token of required) {
  if (!source.includes(token)) {
    throw new Error(
      `Permissions-Policy contract missing: ${token}`
    );
  }
}

const headerMatches =
  source.match(
    /['"]Permissions-Policy['"]/g
  ) || [];

if (headerMatches.length !== 1) {
  throw new Error(
    `Expected exactly one Permissions-Policy header definition; found ${headerMatches.length}`
  );
}

console.log(
  '✅ production Permissions-Policy contract present'
);
console.log(
  'P18 PERMISSIONS-POLICY REGRESSION PASSED'
);
