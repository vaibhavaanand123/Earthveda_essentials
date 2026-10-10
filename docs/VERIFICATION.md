# Verification

The final integration suite contains 29 tests. It uses a real Express server, SQLite, password hashing and Stripe SDK signature verification, with controlled payment/email test doubles. Food, tax and seller values in tests are explicitly fictitious and are not production seeds.

Coverage includes exact bundle pricing, duplicate quantities, atomic basket insertion, archived-item blocking, cookie authentication, role/origin checks, server totals, idempotency replay/conflict, ambiguous payment recovery, signed/forged/duplicate callbacks, amount/mode mismatches, expiration and asynchronous failure, concurrent final-stock reservations, stale product edits, UK postcode/currency checks, tracking requirements, refund replay, private lookup, newsletter double opt-in/unsubscribe, withdrawal receipts, order snapshots, CSV formula escaping, notification retries/dead-letter recovery, restart/lease recovery, backup integrity and email escaping.

Formatting and production bundling are part of `npm run check`.

## Merchant staging acceptance

1. Check home, shop, product, quiz, basket, checkout and legal pages on actual phones/desktops in both languages. Test keyboard navigation, zoom, focus, contrast, screen-reader labels and long German strings.
2. Complete actual Stripe test-mode checkout: success, 3DS, decline, cancel, timeout/retry and eligible asynchronous methods. Close the browser after payment and confirm callbacks alone update the order. Verify stock and full refund.
3. Confirm PayPal/Klarna/wallet eligibility for the actual merchant, EUR amounts and customer country. Maestro requires separate provider validation.
4. Receive real customer/team emails, follow private order links, test tracking updates and inspect bounce/delivery records. Send approved WhatsApp templates only to consenting test recipients; verify language and fees.
5. Confirm/unsubscribe a newsletter address. Submit a withdrawal without login and verify two-step confirmation, immediate downloadable receipt and email receipt.
6. Test real approved labels/policies, out-of-stock and unpublished products, conflicting edits, restart and an off-server restore drill.
7. Verify domain redirects, TLS, secure cookies, trusted proxy, internal API port, production webhook URL, email DNS and backups. Run `npm run doctor` on the intended deployment.

Browser automation was unavailable, so rendered layout and real-device behaviour were not verified here. Docker/Caddy were reviewed but not exercised on a live host. No real merchant payment or messages were sent. Load testing, penetration testing, accessibility certification and legal approval are not claimed. Complete staging checks before opening sales.
