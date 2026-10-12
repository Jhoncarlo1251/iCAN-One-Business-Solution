# iCAN WMS v5 — Implementation status

## Included in this package
- Warehouse Management page in the frontend navigation.
- Demo warehouse and location records.
- Local prototype actions for creating warehouses and storage locations.
- Demo receiving/putaway, location-to-location transfers, cycle counts, pick-list creation, and dispatch confirmation.
- Movement history view.
- Demo POS checkout updates the local location quantities and records a local movement.
- Mobile POS camera scanning prototype using the browser Barcode Detection API where supported; requests rear camera access and stops when leaving POS.
- Bluetooth/USB HID keyboard scanner input retained from Barcode POS v3; manual barcode/SKU entry remains available.
- E-wallet cash-in/cash-out ledger prototype for GCash, Maya, and Other, with local opening balances, cash drawer balance, and float checks. These are manual records only and do not transfer funds.
- E-receipt generation after demo checkout, local receipt history, and print / Save as PDF via the browser print dialog.
- E-wallet payment checkout is visibly marked as coming soon and is not enabled.
- Browser local storage persistence for WMS demo state.
- PostgreSQL schema foundation for products, warehouses, locations, balances, movement ledger, receipts, pick lists, and warehouse transfers.

## Not yet production-ready
- The WMS page is still browser-local demo logic; it does not call backend WMS endpoints.
- The added SQL schema has not been applied to a PostgreSQL database in this package.
- No WMS API routes, server-side transaction logic, or role checks have been implemented yet.
- Camera scanning depends on browser support for `BarcodeDetector`, camera permission, and HTTPS (or localhost); it has not been verified on a physical Android phone.
- E-wallet transactions, balances, and receipts are browser-local only; no provider APIs, payment verification, backend persistence, or multi-device sync are connected.
- No multi-user or multi-device sync is implemented for WMS records.
- Serial/lot and expiry columns are foundations only; complete lot allocation and FEFO/FIFO execution still need implementation and tests.

## Recommended next implementation step
Build authenticated API routes for warehouses, locations, POS sales/receipts, e-wallet ledger entries, inventory movements, pick lists, and transfers. All stock-affecting actions must use database transactions, workspace membership checks, row locking where needed, idempotency keys, and server-side validation. Do not use the local demo data for live customer operations.
