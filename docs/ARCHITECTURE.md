# Architecture

The application separates React presentation, shared integer-cent pricing, HTTP validation/authentication, commerce orchestration, SQLite repositories and provider adapters. `server/app.js` wires dependencies; tests replace payment/email transports while using real HTTP requests, SQLite and password hashing.

| Layer | Responsibility |
| --- | --- |
| `src` | Bilingual customer interfaces, basket and team dashboard |
| `shared` | Market/currency rules, catalogue seed and deterministic pricing |
| `server/http` | Schemas, origin checks, limits and safe errors |
| `server/services/commerceService.js` | Reserve, verify, fulfil, refund and reconcile orders |
| `server/db/store.js` | Versioned products/settings, order snapshots and inventory operations |
| `server/services/payments.js` | Hosted Stripe Checkout and stable provider idempotency keys |
| `server/services/notifications.js` | Durable jobs, leases, backoff and escaped emails |
| `server/services/auth.js` | Individual roles, scrypt hashes and expiring hashed sessions |

The server calculates money from current products and approved delivery rates. A transaction reserves stock and creates a pending order. Network calls run outside that transaction. Only a verified paid provider session matching EUR total, order reference and mode commits stock and confirms an order. Duplicate callbacks cannot sell stock twice. Provider creation failures retain reservations for safe replay and reconciliation. Expired/failed sessions release holds once. Old orders retain product and policy snapshots after edits/archiving.

Staff cookies are HttpOnly, SameSite and Secure in production. Staff writes require the configured origin; owners control refunds, legal settings and account access. Public order pages disclose minimal details. Input validation, bound SQL, image signature/size checks, CSP, no-referrer policy, escaped emails and spreadsheet-safe CSV protect the implemented interfaces. Card details stay with Stripe. MFA, penetration testing and encrypted database contents are not claimed; host disks/backups and operator access need appropriate protection.

Outbox jobs survive restarts, retry with backoff and fail after ten attempts. Owners can retry after correcting configuration. Email idempotency is subject to the provider's retention period. WhatsApp can repeat after an ambiguous acceptance timeout. Sent means provider acceptance, not delivery or read confirmation. Desktop alerts require the order dashboard to remain open; persistent off-page alerts use email/WhatsApp.

The supplied topology is one Node instance with persistent local SQLite WAL. It does not provide horizontal replication. Before horizontal scaling, migrate to a shared transactional database, asynchronous repositories, shared rate/session state and separately coordinated workers. Preserve conditional inventory changes, idempotency and immutable snapshots. Do not run detached database copies or place SQLite on an unsuitable network filesystem.

Tax invoices, carrier-label purchasing, customs filing, warehouse lot/expiry traceability and marketing campaign sending are outside the implemented scope. They require dedicated services and operational procedures.
