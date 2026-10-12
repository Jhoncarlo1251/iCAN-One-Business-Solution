# iCAN POS — Bluetooth HID barcode scanner test

This build implements browser keyboard-emulation (HID) scanner support. It does not use a vendor-specific Bluetooth SDK. The scanner must be paired to the device and configured to type the barcode as keyboard input. The product/POS/inventory flow is local demo data; it is not yet connected to PostgreSQL.

## 1. Prepare a product

1. Open **Products**.
2. Edit a built-in demo product or add a new product.
3. Set a barcode that matches the barcode label you intend to scan. Built-in test products have these demo codes:
   - Everyday Water Bottle: `100000000001`
   - Canvas Tote Bag: `100000000002`
   - Desk Organizer: `100000000003`
   - Ceramic Mug: `100000000004` (out of stock by default)
   - Notebook Set: `100000000005`
4. Save. SKU and barcode duplicates are rejected by the local UI.

These are test-only values, not real retail product identifiers. A physical label must encode the exact same text to match.

## 2. Pair and configure scanner

1. Pair the Bluetooth scanner from Android/Windows device settings.
2. If the scanner offers profiles, select **HID Keyboard**, **Keyboard**, or **Bluetooth HID** mode.
3. Configure the scanner to send **Enter/Return** after each scan if the model supports a suffix setting. The POS also supports a fast keyboard scan followed by Enter when focus is outside a text field.
4. Open the app through HTTP/HTTPS (for example, VS Code Live Server); do not use a `file://` URL for API testing.

## 3. Test the POS flow

1. Open **Sales & POS**. The barcode/search input should receive focus automatically.
2. Scan a known barcode. The matching item should be added to the cart.
3. Scan the same barcode again. The cart quantity should increment.
4. Scan an unknown barcode. The app should show a not-found message and not add a product.
5. Try the Ceramic Mug demo code. Since its stock is zero, the app should show an out-of-stock message.
6. Click **Complete demo sale**. The app should create a demo sale, deduct local stock, and update sales/stock views.
7. Refresh the page to verify local demo records persist in the same browser profile.

## Limitations

- The checkout is simulated; no payment is processed.
- Product, sales, and inventory data are stored in browser localStorage, not PostgreSQL, in this build.
- HID keyboard behavior varies by scanner, browser, OS, suffix configuration, and focus state. Test with the actual scanner and target device before relying on it.
- The keyboard listener does not capture scanner input while a text input/select/textarea is focused other than the POS scan field. The POS scan field is automatically focused when opening the page and after cart actions.
- For production, implement server-side product/sales endpoints and atomic stock transactions, barcode uniqueness constraints, role permissions, audit events, and automated browser/hardware testing.
