# Earthveda Essentials Commerce v5

A German-first, bilingual storefront and order operations application for Germany and Great Britain, including London. Built from the supplied v4 project. The full application uses React, Express, Node 24 and a persistent SQLite database. Stripe handles payment collection; Resend and the WhatsApp Cloud API send order updates.

**Status:** implementation and automated integration checks are complete. Live checkout starts disabled. Merchant credentials, approved business and food information, real inventory and fulfilment arrangements are required before sales. This package does not claim legal certification or a completed live payment test.

## What is included

- German/English storefront toggle, Germany/UK delivery selection and euro prices in both markets.
- Home flavour quiz: select four different flavours, two of each for eight packs or four of each for sixteen packs, then add the entire bundle to the basket.
- Matching rectangular hero windows for foxnuts and Plant protein; updated Plant protein packaging mockups and preparation copy.
- Server-priced, stock-reserving checkout, hosted payment page, signed callbacks and payment reconciliation. A redirect alone never confirms payment.
- Customer order page, private emailed tracking link, fulfilment states and parcel tracking.
- Individual owner/staff accounts, product creation/editing/archiving, image uploads, stock, bilingual food data, legal/story settings, order CSV and owner-only full refunds.
- Durable email/optional WhatsApp jobs, retry and failed-job dashboard; optional desktop alerts while the order dashboard is open.
- Double opt-in newsletter subscription, confirmation and unsubscribe routes, confirmed subscriber export.
- Legal footer, imprint/privacy/terms/shipping/withdrawal/accessibility pages and a highlighted online withdrawal function with a downloadable receipt.
- Docker/Caddy production configuration, backup command, deployment guide, architecture notes and integration tests.

## Prices and delivery

All amounts below are gross euro amounts. No tax percentage, weight or stock quantity has been invented. The initial €2.99 price applies to all seeded flavours, including Plant protein; confirm this assumption before launch.

| Item | Price, excluding shipping |
| --- | ---: |
| Single pack | 2,99 € |
| 8 packs: four flavours × 2 | 23,92 € |
| 16 packs: four flavours × 4 | 47,84 € |

| Destination | Standard | Express |
| --- | ---: | ---: |
| Germany | 4,99 € | 7,99 € |
| Great Britain | 9,99 € | 11,99 € |

These are configurable initial shipping choices within your requested range, not confirmed carrier quotations. The owner must publish actual delivery timings and verify costs. Northern Ireland, the Channel Islands and Isle of Man are excluded. The UK selector currently allows Great Britain, not only London; restrict postcode coverage if your carrier only serves London. UK cardholders may incur their bank's EUR/GBP conversion charge.

## Run locally

Install Node.js 24 or newer. Extract the ZIP and open the directory containing `package.json`. Do not run npm from the ZIP's parent folder.

```bash
npm ci
```

Copy `.env.example` to `.env` using your file manager. On Linux/macOS, `cp .env.example .env` also works. Set an individual `ADMIN_BOOTSTRAP_EMAIL` and a unique `ADMIN_BOOTSTRAP_PASSWORD` of at least 14 characters. Leave `CHECKOUT_ENABLED=false` while configuring the shop.

Start the API in one terminal:

```bash
npm run dev:api
```

Start the storefront in another:

```bash
npm run dev
```

Open `http://localhost:5173` and `/admin`. Vite proxies the same-origin API and uploaded product images. The first owner is created only when the staff table is empty. Remove bootstrap values from `.env` after verifying login and restart the API. Add individual team accounts in the dashboard. Never put provider secrets in a `VITE_` variable or send them through chat.

New databases contain the supplied ten product flavours with **zero stock and unverified food data**. Edit products in the admin, enter stock, actual net weights, ingredients, allergens, storage, nutrition, responsible food operator and verified tax rates for DE/GB. Product verification requires those fields. Draft/archived products do not appear in the storefront.

Enter business identity, bilingual policies and story under Settings. Approvals are deliberate merchant decisions, not automatic legal checks. When provider setup and merchant review are finished, enable `CHECKOUT_ENABLED=true` and restart the API.

## Production and domain

Follow [docs/LAUNCH_GUIDE.md](docs/LAUNCH_GUIDE.md). The intended production URL is `https://earthvedaessentials.de`. Deploy the **full Node application** to a server with durable storage, not a static web host.

The separate private storefront preview uses `npm run build:preview`. It uses preview product data and disables checkout, newsletter submission and order operations. It is a design review surface; it does not accept money or save real orders. The default `npm run build` and Docker build use the real `/api` backend.

## Payment capabilities

Hosted Stripe Checkout can offer eligible Visa, Mastercard, American Express, PayPal, Klarna and wallets when enabled for your merchant account. The provider decides which methods are available for the customer, currency, country and basket value. No raw card details enter this application.

**Maestro is not promised by this Stripe integration.** It is absent from Stripe's current supported card brand list. If Maestro acceptance is essential, validate the exact card and acquiring arrangement with your payment provider or commission an additional compatible provider adapter before launch. A payment logo is not proof of acceptance.

## Checks

```bash
npm run check
npm run doctor
npm run db:backup
```

`check` runs formatting, automated tests and a production build. `doctor` reports missing launch configuration without printing secrets; a new unconfigured shop intentionally fails it. `db:backup` creates a consistent online SQLite backup. Copy backups off the server and protect them as customer data.

Read [docs/VERIFICATION.md](docs/VERIFICATION.md) for tested cases and remaining live/browser checks. Browser layout, real Stripe transactions, carrier operations and actual email/WhatsApp delivery need merchant staging verification.

## Operations and scaling

The included deployment is a single API instance with a local persistent SQLite volume, transactional stock and a durable outbox. It is suitable for an initial shop and does not claim horizontal scaling. Do not run independent replicas against copied databases or put SQLite on an unsuitable network filesystem. Migrate the repository and workers to a shared transactional database and distributed coordination before horizontal deployment. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Existing v4 manual orders remain in their original database tables after migration, but are not shown in the v5 commerce dashboard. Export and reconcile legacy orders before switching; do not relabel manual orders as paid. New v5 orders keep their own product and policy snapshots. Back up the original database before upgrading.

The PDF story was not available among the supplied files. The current brand introduction is generic and avoids invented founder history. Supply the PDF and replace the bilingual Story fields. Admin operations copy remains English; customer storefront and receipts support German/English. WhatsApp template language is configured separately.

Further reading: [launch guide](docs/LAUNCH_GUIDE.md), [compliance inputs](docs/COMPLIANCE_INPUTS.md), [operations runbook](docs/OPERATIONS.md), [asset changes](docs/ASSETS.md).
