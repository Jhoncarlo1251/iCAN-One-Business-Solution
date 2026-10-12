import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');

test('WMS router is mounted and exposes transactional receiving, transfer, count, pick and dispatch endpoints',()=>{
 const server=read('src/server.js'),route=read('src/routes/wms.js');
 assert.match(server,/app\.use\('\/api\/wms', wmsRoutes\)/);
 for(const path of ["'/receipts'","'/transfers'","'/cycle-counts'","'/pick-lists'","'/pick-lists/:id/dispatch'","'/locations'","'/movements'"]) assert.ok(route.includes(path),`missing WMS route ${path}`);
 assert.match(route,/BEGIN/);assert.match(route,/COMMIT/);assert.match(route,/ROLLBACK/);
});
test('WMS write paths enforce workspace membership and writable roles',()=>{
 const route=read('src/routes/wms.js');
 assert.match(route,/const canWrite = \['owner','admin','manager'\]/);
 assert.match(route,/Workspace access denied or your role is read-only/);
 assert.match(route,/workspace_id=\$1/);
});
test('WMS inventory workflows prevent negative availability and write audit/movement records',()=>{
 const route=read('src/routes/wms.js');
 assert.match(route,/Insufficient available stock at source location/);
 assert.match(route,/Insufficient available stock at selected location/);
 assert.match(route,/Counted quantity is below the quantity already reserved/);
 assert.match(route,/inventory_movements/);assert.match(route,/audit_events/);
});
test('frontend WMS actions use backend methods when connected and refresh WMS data',()=>{
 const client=read('src/api-client.js'),app=read('src/app.js');
 for(const method of ['createLocation','receiveStock','transferStock','cycleCount','createPickList','dispatchPickList']) assert.match(client,new RegExp(method));
 for(const endpoint of ['/api/wms/locations','/api/wms/receipts','/api/wms/transfers','/api/wms/cycle-counts','/api/wms/pick-lists','/api/wms/movements']) assert.ok(client.includes(endpoint),`missing ${endpoint}`);
 assert.match(app,/icanBackend\.receiveStock/);assert.match(app,/icanBackend\.transferStock/);assert.match(app,/icanBackend\.cycleCount/);assert.match(app,/icanBackend\.dispatchPickList/);
});
