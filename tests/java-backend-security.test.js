import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const security = readFileSync(new URL('../backend-java/src/main/java/com/ican/backend/config/SecurityConfig.java', import.meta.url), 'utf8');
const api = readFileSync(new URL('../backend-java/src/main/java/com/ican/backend/api/ApiController.java', import.meta.url), 'utf8');
const frontend = readFileSync(new URL('../src/api-client.js', import.meta.url), 'utf8');

test('Java API allows public auth endpoints but requires write roles for mutations', () => {
  assert.match(security, /requestMatchers\("\/api\/health",\s*"\/api\/health\/db",\s*"\/api\/auth\/register",\s*"\/api\/auth\/login"\)\.permitAll\(\)/);
  for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
    assert.match(security, new RegExp(`requestMatchers\\(HttpMethod\\.${method}, "\\/api\\/\\*\\*"\\)\\.hasAnyRole\\("OWNER", "ADMIN", "MANAGER"\\)`));
  }
  assert.match(security, /anyRequest\(\)\.authenticated\(\)/);
});

test('Java backend exposes the core paths used by the frontend bridge', () => {
  for (const path of ['/products', '/customers', '/suppliers', '/expenses', '/finance/summary', '/tasks', '/warehouses', '/warehouses/locations', '/inventory', '/inventory/adjustments', '/sales/checkout', '/sales', '/wms/movements', '/wms/pick-lists', '/wms/locations', '/wms/receipts', '/wms/transfers', '/purchase-orders']) {
    assert.ok(api.includes(`"${path}"`), `Missing Java API mapping ${path}`);
  }
  assert.match(frontend, /request\(`\/api\/products\?workspaceId=/);
  assert.match(frontend, /request\('\/api\/sales\/checkout'/);
});

test('Java deployment keeps database private and requires strong secrets', () => {
  const compose = readFileSync(new URL('../docker-compose.java.yml', import.meta.url), 'utf8');
  assert.doesNotMatch(compose, /ports:\s*\["5432:5432"\]/);
  assert.match(compose, /JWT_SECRET:\s*\$\{JWT_SECRET:\?Set JWT_SECRET/);
  assert.match(compose, /DATABASE_PASSWORD:\s*\$\{DATABASE_PASSWORD:\?Set DATABASE_PASSWORD/);
});
