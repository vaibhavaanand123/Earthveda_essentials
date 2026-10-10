# Launch Earthveda Essentials on earthvedaessentials.de

The application is implemented. Turning it into a live business requires the following merchant-owned inputs and account connections. Complete these in staging, then switch payment mode and enable sales.

## 1. Business, products and delivery

In `/admin`, Settings, enter the actual seller's legal name, postal address, representative, public email, return address and applicable register/VAT details. Add reviewed German and English terms, privacy, withdrawal and delivery policies. Supply actual processors, retention rules, dispute-resolution wording and accessibility statement as applicable. Set a policy version whenever terms change.

For each product enter real food information, net weight and DE/GB tax classification, stock, approved image and bilingual descriptions. Nutrition is per 100 g. Highlight allergens appropriately within the ingredients and in the dedicated allergen field. Mark verified only after reviewing against the label. The shop computes per-kg unit pricing from the real weight. Confirm whether the €2.99 price also applies to Plant protein.

Verify the initial standard/express delivery rates, delivery estimates and postcode coverage with your carriers. UK fulfilment remains gated until you confirm UK stock or a duties-paid shipping arrangement. Verify UK VAT, import responsibilities and food operator/address requirements for the actual supply chain; choosing a setting does not perform a customs registration.

Upload the story PDF or enter its approved German/English text under Story. Review mockup artwork against production labels before selling.

## 2. Stripe payment setup

Create or use your business's verified Stripe account. Complete merchant verification and bank payout setup. In the Dashboard enable cards and eligible PayPal/Klarna/wallet methods. Availability can differ by merchant country, customer and order amount. Do not promise Maestro without separate provider confirmation.

Use test-mode values in the server's `.env`:

```dotenv
STRIPE_SECRET_KEY=sk_test_REPLACE_LOCALLY
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_LOCALLY
STRIPE_LIVE_MODE=false
```

For local testing, use Stripe CLI to forward signed events to `http://localhost:8787/api/webhooks/stripe`, or use a real HTTPS staging domain. Set `PUBLIC_SITE_URL` to the exact storefront origin; staff writes reject other origins.

Configure the production webhook destination:

```text
https://earthvedaessentials.de/api/webhooks/stripe
```

Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `refund.updated` and `refund.failed`. Save the endpoint-specific signing secret in the server environment. Changing from staging/test to live requires the live endpoint secret as well as the live secret key and `STRIPE_LIVE_MODE=true`.

Run a real test-mode checkout with 3DS, cancellation, failed payment and duplicate webhook delivery. Verify the order only changes to Confirmed after the server verifies the provider's EUR amount, currency, ownership and mode. Confirm stock and notification jobs. Test an owner-issued refund. Stripe fees, payout timing and chargeback handling are merchant account responsibilities.

References: [Checkout fulfilment](https://docs.stripe.com/checkout/fulfill-orders), [webhooks](https://docs.stripe.com/webhooks), [cards](https://docs.stripe.com/payments/cards), [PayPal](https://docs.stripe.com/payments/paypal), [Klarna](https://docs.stripe.com/payments/klarna).

## 3. Email and WhatsApp

Create a Resend account and verify a sending domain. Add the DNS records it supplies; use a sender such as `Earthveda Essentials <orders@earthvedaessentials.de>`. Configure `RESEND_API_KEY`, `EMAIL_FROM` and `TEAM_EMAIL`. Configure a functioning mailbox for the public support/reply address. An email API does not create your inbox.

Send a test receipt to a mailbox you control and verify SPF/DKIM, spam handling and reply behaviour. Do not delete existing MX records when adding website records. Add appropriate DMARC after confirming alignment with your mail provider. The notification dashboard records provider acceptance, not final inbox delivery; monitor the provider dashboard/bounces.

For optional WhatsApp, connect a business-owned Meta WhatsApp Cloud API number. Store its token and phone-number ID only on the server. Create an approved utility template matching `WHATSAPP_TEMPLATE` and `WHATSAPP_TEMPLATE_LANG`, with four body parameters in this order: first name, order number, order status, formatted euro total. Configure a supported `WHATSAPP_GRAPH_VERSION` and verify the template's current approval and API permissions with Meta. The default `v23.0` is configurable, not a permanent support guarantee.

The checkout checkbox is optional and initially unchecked. It becomes available only when WhatsApp keys are configured. Team WhatsApp alerts require a recipient in international digits and explicit `TEAM_WHATSAPP_OPT_IN=true`. Do not turn transactional consent into marketing consent. The template language is currently shared across the business; configure German or English intentionally. Meta delivery webhooks and read-receipt reporting are not implemented.

References: [Resend sending API](https://resend.com/docs/api-reference/emails/send-email), [Meta Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/).

## 4. Server and DNS

Use a Linux server with Docker Compose, durable disk, off-server encrypted backups and inbound ports 80/443. Restrict SSH and operator access. The included configuration keeps the API's port 8787 inside the Docker network and uses Caddy for HTTPS and the same-origin storefront/API.

Create a production `.env` from `.env.example`. Set real secrets locally, owner bootstrap details, email settings and approved provider mode. Set `VITE_PUBLIC_SITE_URL=https://earthvedaessentials.de` for a direct build; the Docker build already defaults to that domain. Keep `CHECKOUT_ENABLED=false` for initial setup.

At your domain registrar/DNS provider:

| Record | Name | Value |
| --- | --- | --- |
| A | `@` | Your production server's public IPv4 address |
| AAAA, only if IPv6 works | `@` | Your production server's IPv6 address |
| CNAME | `www` | `earthvedaessentials.de` |
| Email records | As provided | Preserve MX; add sender verification SPF/DKIM/DMARC correctly |

Remove stale website records that conflict with the selected host. Incorrect AAAA records can break HTTPS even when the A record is correct. The included Caddyfile redirects `www` to the apex and obtains TLS certificates automatically after DNS resolves and ports are reachable.

From the extracted project root:

```bash
docker compose up -d --build
docker compose logs --tail=100 app
```

Open `/api/health`, then `/admin`. Remove bootstrap credentials after the first successful login and recreate the app container to remove them from its environment. Keep exactly one trusted proxy (`TRUST_PROXY=1`) with this topology. If using a managed application host instead, attach a persistent disk, configure the domain there, use the host's documented DNS target and set the correct trusted proxy count.

The chatgpt.site preview is static and cannot run this Node/SQLite API. It cannot be turned into the live checkout merely by changing a DNS name. Use the full application server above for `earthvedaessentials.de`.

## 5. Final sale gate

Complete the merchant review in [COMPLIANCE_INPUTS.md](COMPLIANCE_INPUTS.md), approve legal/shipping settings, and approve UK fulfilment when applicable. Run the automated checks, doctor and the staging acceptance sequence in [VERIFICATION.md](VERIFICATION.md). Back up and restore a test database.

Configure live-mode Stripe secrets and endpoint. Set `CHECKOUT_ENABLED=true`, recreate the app and place a small real transaction under your business's test procedure. Confirm receipt, payment capture/payout view, stock, tracking and refund. Check both language/country selections on actual phones. Keep UK disabled if its import/VAT arrangements are incomplete. Monitor orders, webhook failures and notification retries after opening.
