# Operations and recovery

Use individual staff accounts. Staff manage products and fulfil paid orders. Owners manage settings/accounts, issue full refunds, reconcile payments and retry failed jobs. Archive products to remove them from the shop without deleting historical order snapshots. Reload after stale-version conflicts before saving again.

Process Confirmed → Packed → Shipped → Delivered. Shipped requires the real parcel code and HTTPS tracking URL. Review address, notes and physical contents. Order CSV contains personal data and is not a legally complete tax invoice. Returned food needs a suitability check before manually restoring stock. Withdrawal declarations require review and do not automatically trigger refunds.

Stock is physical quantity; reservations reduce availability. Do not reduce stock below reservations. Provider outages may retain holds until payment truth can be verified. Compare provider order metadata, EUR amount and payment intent when reconciliation reports a problem. A customer redirect is not proof of payment.

Monitor health, logs, Stripe webhook failures, pending/refund orders and notification jobs. Provider acceptance is not proof of final email/WhatsApp delivery. Correct sender verification, keys, template approval or consent before retrying failed jobs. Email/WhatsApp run independently of the browser; desktop alerts require an open dashboard and permission. External monitoring and provider delivery webhooks are not provisioned.

## Backups

Create a consistent SQLite backup while the service runs:

```bash
npm run db:backup
```

For Docker:

```bash
docker compose exec app node server/scripts/backup.js /app/data/backups
docker compose cp app:/app/data/backups ./backups
```

Back up uploaded images from `/app/data/images` too. Copy backups to access-controlled, encrypted off-server storage; retain secrets in a secret manager separately. A backup on the same server does not cover disaster recovery.

Restore first in staging. Stop the application, preserve the current database for investigation, restore the chosen backup to a separate recovery volume and the configured database path, restore images and verify file ownership/integrity. Remove stale WAL/SHM files from the previous database only with the application stopped and after preserving that database. Before reopening checkout, compare recent orders with Stripe and reconcile payments, refunds and physical stock. An old backup can omit payments already processed by the provider.

## Upgrades and access

Back up before upgrades. Test the new release against a copied database and run `npm run check`. Migrations append versions; do not edit applied migrations or run an old binary against an upgraded database. Verify health, login, products, callbacks and queues before enabling sales.

The first-owner bootstrap only operates on an empty staff table. Changing bootstrap values does not reset an existing password. Keep a second controlled owner or use an audited operator recovery procedure. Automated password reset and MFA are not included. Existing v4 manual orders remain in legacy tables and are not displayed in the v5 dashboard; export/reconcile them before switching and retain required records.

Do not put secrets in source, browser bundles or chat. Rotate compromised keys. Update Node/container dependencies in a controlled deployment process and review provider API deprecations. CI/security scanning, actual retention schedules, food recalls and accounting operations must be configured by your team.
