import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../src/server.js', import.meta.url), 'utf8');
const envExample = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');

test('local CORS defaults allow common local frontend origins', () => {
  assert.match(server, /http:\/\/localhost:5500/);
  assert.match(server, /http:\/\/127\.0\.0\.1:5500/);
});

test('production startup fails closed when core security configuration is missing', () => {
  assert.match(server, /isProduction && \(!process\.env\.DATABASE_URL/);
  assert.match(server, /process\.env\.JWT_SECRET\.length < 32/);
  assert.match(server, /!process\.env\.CORS_ORIGINS/);
});

test('environment template does not encourage a production deployment with a weak secret', () => {
  assert.match(envExample, /JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET_AT_LEAST_32_BYTES/);
  assert.match(envExample, /CORS_ORIGINS=http:\/\/localhost:5500/);
});
