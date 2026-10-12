from pathlib import Path
root=Path(__file__).parent
api=(root/'src/main/java/com/ican/backend/api/ApiController.java').read_text()
security=(root/'src/main/java/com/ican/backend/config/SecurityConfig.java').read_text()
schema=(root/'src/main/resources/db/migration/V1__initial_schema.sql').read_text()
checks={
 'health and database health endpoints':'/health/db' in api and 'SELECT 1' in api,
 'JWT authentication and BCrypt password hashing':'Jwts.builder()' in api and 'BCryptPasswordEncoder' in security,
 'workspace scope enforcement':'Workspace access denied' in api,
 'product and CRM endpoints':'/products' in api and '/customers' in api and '/suppliers' in api,
 'expense and finance endpoints':'/expenses' in api and '/finance/summary' in api,
 'inventory and POS endpoints':'/inventory/adjustments' in api and '/sales/checkout' in api,
 'WMS and purchasing endpoints':'/wms/transfers' in api and '/purchase-orders' in api,
 'database migration core tables':all(t in schema for t in ['app_users','products','customers','suppliers','expenses','inventory_balances','sales','purchase_orders','audit_events']),
 'JWT secret fails closed':'JWT_SECRET must be set' in security,
 'write endpoints require owner/admin/manager roles':all(f'HttpMethod.{m}, "/api/**").hasAnyRole("OWNER", "ADMIN", "MANAGER")' in security for m in ['POST','PATCH','PUT','DELETE']),
}
for name,ok in checks.items(): print(('PASS' if ok else 'FAIL')+' '+name)
if not all(checks.values()): raise SystemExit(1)
