# iCAN v6 API examples

Use a token from `/api/auth/register` or `/api/auth/login`. Examples use placeholders and should be run against a test database only.

## Create a product
```http
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{"workspaceId":"<workspace-uuid>","sku":"SKU-001","barcode":"123456789012","name":"Water bottle","category":"Accessories","sellingPrice":12.5,"costPrice":5,"reorderLevel":10}
```

## Adjust stock
```http
POST /api/inventory/adjustments
Authorization: Bearer <token>
Content-Type: application/json

{"workspaceId":"<workspace-uuid>","productId":"<product-uuid>","locationId":"<location-uuid>","quantityDelta":25,"notes":"Opening count","idempotencyKey":"<unique-request-uuid>"}
```

## Checkout
```http
POST /api/sales/checkout
Authorization: Bearer <token>
Content-Type: application/json

{"workspaceId":"<workspace-uuid>","idempotencyKey":"<unique-checkout-uuid>","customerName":"Walk-in customer","paymentMethod":"cash","items":[{"productId":"<product-uuid>","locationId":"<location-uuid>","quantity":2}]}
```
