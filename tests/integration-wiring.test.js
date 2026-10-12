import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('frontend API bridge exposes PostgreSQL-backed core operations',()=>{
 const client=read('src/api-client.js');
 for(const method of ['getCoreData','createProduct','updateProduct','adjustStock','createWarehouse','checkoutSale']) assert.match(client,new RegExp(method));
 for(const endpoint of ['/api/products','/api/inventory/adjustments','/api/warehouses','/api/warehouses/locations','/api/sales/checkout']) assert.ok(client.includes(endpoint),`missing ${endpoint}`);
});
test('core UI actions use remote API when connected and label demo paths honestly',()=>{
 const app=read('src/app.js');
 assert.match(app,/icanSetRemoteCoreData/);
 assert.match(app,/icanBackend\.createProduct/);
 assert.match(app,/icanBackend\.adjustStock/);
 assert.match(app,/icanBackend\.checkoutSale/);
 assert.match(app,/Demo sale saved locally/);
});
test('product update API supports SKU and workspace-scoped field validation',()=>{
 const route=read('src/routes/products.js');
 assert.match(route,/sku:z\.string\(\)\.trim\(\)\.min\(1\)\.max\(100\)\.optional\(\)/);
 assert.match(route,/WHERE id=\$10 AND workspace_id=\$11/);
});
