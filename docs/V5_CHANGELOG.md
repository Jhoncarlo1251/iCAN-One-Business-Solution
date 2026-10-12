# iCAN One Business Solution — v5 changes

## Added in this prototype
- Mobile camera barcode scanning using the browser Barcode Detection API where available.
- Retained Bluetooth/USB HID scanner input and manual barcode/SKU entry.
- E-wallet counter ledger prototype: opening balances, cash-in, cash-out, cash drawer balance, GCash/Maya/Other float checks.
- E-receipt generated after demo checkout, receipt history, and browser print / Save as PDF.
- Navigation entries for E-Wallet Cash In/Out and E-Receipts.

## Explicit limitations
- Camera detection is browser-dependent and requires permission plus HTTPS or localhost. It has not been tested on the user's physical phone.
- Scanner, wallet ledger, POS, inventory, and receipts remain browser-local demo logic in this version.
- No actual GCash/Maya transfer or e-wallet payment is made. Payment gateway integration is future work.
- E-receipts are prototype receipts, not guaranteed tax invoices or legally compliant receipts.
- The WMS schema foundation is not yet integrated with authenticated WMS API routes or verified against a live PostgreSQL database.
