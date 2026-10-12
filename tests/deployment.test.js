import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('deployment keeps PostgreSQL off the public host and persists its data', () => {
  const compose = read('docker-compose.yml');
  assert.match(compose, /ican_pgdata:\/var\/lib\/postgresql\/data/);
  assert.match(compose, /networks:\s*\[backend\]/);
  assert.doesNotMatch(compose, /5432:5432/);
});

test('deployment requires strong secrets and exact origin configuration', () => {
  const compose = read('docker-compose.yml');
  assert.match(compose, /POSTGRES_PASSWORD:\?Set a strong/);
  assert.match(compose, /JWT_SECRET:\?Set a random JWT_SECRET/);
  assert.match(compose, /CORS_ORIGINS:\?Set exact trusted/);
});

test('frontend uses same-origin API by default outside local development', () => {
  const client = read('src/api-client.js');
  assert.match(client, /location\.hostname === 'localhost'/);
  assert.match(client, /window\.ICAN_API_BASE \?\? DEFAULT_API_BASE/);
});

test('release documentation does not claim all modules are production-certified', () => {
  const docs = read('docs/DEPLOYMENT.md');
  assert.match(docs, /not a claim that every product module is production-certified/i);
  assert.match(docs, /Go-live blockers/);
});
