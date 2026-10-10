import { loadConfig } from '../config.js';
import { openDatabase } from '../db/database.js';
import { createStore } from '../db/store.js';
try {
  const config = loadConfig();
  const db = openDatabase(config.databasePath);
  const store = createStore(db);
  const s = store.settings();
  const checks = [
    ['Payment secret configured', !!config.STRIPE_SECRET_KEY],
    ['Webhook secret configured', !!config.STRIPE_WEBHOOK_SECRET],
    ['Email sender configured', !!config.RESEND_API_KEY && !!config.EMAIL_FROM],
    ['Team recipient configured', !!config.TEAM_EMAIL],
    ['Legal content approved', s.legalApproved],
    ['Delivery rates approved', s.shippingApproved],
    ['UK fulfilment approved', s.ukApproved],
    [
      'Products verified for sale',
      store
        .products()
        .filter((p) => p.published)
        .every((p) => p.complianceReady && p.stock > 0),
    ],
    [
      'Staff owner exists',
      !!db.prepare("SELECT 1 FROM staff WHERE role='owner' AND active=1").get(),
    ],
  ];
  for (const [label, ok] of checks) console.log((ok ? 'OK   ' : 'NEED ') + label);
  console.log('CHECKOUT_ENABLED=' + config.CHECKOUT_ENABLED);
  db.close();
  process.exitCode = checks.every(([, ok]) => ok) ? 0 : 1;
} catch (e) {
  console.error('Configuration check failed. ' + e.message);
  process.exitCode = 1;
}
