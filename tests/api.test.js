import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { after, before, test } from 'node:test';
import Stripe from 'stripe';
import { createApp } from '../server/app.js';
import { loadConfig } from '../server/config.js';
import { openDatabase } from '../server/db/database.js';
import { silentLogger } from '../server/lib/logger.js';
import { productSchema, settingsSchema } from '../server/services/schemas.js';
const origin = 'http://localhost:5173';
const secret = 'whsec_testsecret';
const sessions = new Map();
const byOrder = new Map();
let failAfterCreate = false;
let calls = 0;
const payments = {
  async createSession(o) {
    let s = byOrder.get(o.id);
    if (!s) {
      calls++;
      s = {
        id: 'cs_test_' + crypto.randomBytes(12).toString('hex'),
        url: 'https://checkout.stripe.com/test',
        client_reference_id: o.id,
        metadata: { order_id: o.id },
        livemode: false,
        amount_total: o.total,
        currency: 'eur',
        payment_status: 'unpaid',
        status: 'open',
        payment_intent: 'pi_' + o.id,
      };
      byOrder.set(o.id, s);
      sessions.set(s.id, s);
    }
    if (failAfterCreate) {
      failAfterCreate = false;
      throw new Error('Simulated connection lost after provider created checkout');
    }
    return s;
  },
  async retrieveSession(id) {
    const s = sessions.get(id);
    if (!s) throw new Error('Unknown session');
    return s;
  },
  async findSession(o) {
    return byOrder.get(o.id) || null;
  },
  verifyWebhook(body, signature) {
    return new Stripe('sk_test_fake').webhooks.constructEvent(body, signature, secret);
  },
  async refund(o) {
    return {
      id: 're_' + o.id,
      status: 'succeeded',
      amount: o.total,
      currency: 'eur',
      payment_intent: o.paymentIntent,
    };
  },
  async retrieveRefund() {
    return { id: 're_fixture', status: 'succeeded' };
  },
};
let server, base, store, service, worker, db, cookie;
const customer = {
  firstName: 'Test',
  lastName: 'Customer',
  email: 'buyer@example.com',
  phone: '+4915112345678',
  street: 'Test Street 12',
  unit: '',
  postalCode: '10115',
  city: 'Berlin',
};
const draft = (overrides = {}) => ({
  market: 'DE',
  language: 'en',
  shippingMethod: 'standard',
  items: [{ productId: 'peri-peri', quantity: 2 }],
  customer,
  acceptTerms: true,
  ...overrides,
});
const post = (path, body, headers = {}) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
const admin = (path, method = 'GET', body) =>
  fetch(base + '/admin' + path, {
    method,
    headers: {
      Cookie: cookie,
      Origin: origin,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
const checkout = (body = draft(), key = crypto.randomUUID()) =>
  post('/orders', body, { 'Idempotency-Key': key });
const eventFor = (s) => ({
  id: 'evt_' + crypto.randomUUID(),
  type: 'checkout.session.completed',
  livemode: false,
  data: { object: s },
});
const signed = (event) => {
  const body = JSON.stringify(event);
  const ts = Math.floor(Date.now() / 1000);
  const sig = crypto
    .createHmac('sha256', secret)
    .update(ts + '.' + body)
    .digest('hex');
  return { body, signature: `t=${ts},v1=${sig}` };
};
const webhook = (event) => {
  const x = signed(event);
  return fetch(base + '/webhooks/stripe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Stripe-Signature': x.signature },
    body: x.body,
  });
};
before(async () => {
  db = openDatabase(':memory:');
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_PATH: ':memory:',
    STATIC_DIR: './does-not-exist',
    PUBLIC_SITE_URL: origin,
    CHECKOUT_ENABLED: 'true',
    STRIPE_SECRET_KEY: 'sk_test_fake',
    STRIPE_WEBHOOK_SECRET: secret,
    RESEND_API_KEY: 're_fake',
    EMAIL_FROM: 'Earthveda <shop@example.com>',
    TEAM_EMAIL: 'team@example.com',
    ADMIN_BOOTSTRAP_EMAIL: 'owner@example.com',
    ADMIN_BOOTSTRAP_PASSWORD: 'test-owner-password-1234',
    ORDER_RATE_LIMIT: '10000',
  });
  const x = createApp({
    config,
    db,
    logger: silentLogger,
    payments,
    notificationFetcher: async () => new Response('{}', { status: 200 }),
  });
  ({ store, service, worker } = x);
  await x.ready;
  for (const p of store.products())
    store.saveProduct(
      {
        ...p,
        stock: 100,
        complianceReady: true,
        netWeightGrams: 40,
        descriptionDe: 'Testbeschreibung',
        ingredients: { de: 'Testzutaten', en: 'Test ingredients' },
        allergens: { de: 'Testallergene', en: 'Test allergens' },
        storage: { de: 'Testlagerung', en: 'Test storage' },
        foodOperator: 'Test operator address',
        taxRates: { DE: 7, GB: 20 },
        nutrition: {
          energyKj: 100,
          energyKcal: 25,
          fat: 1,
          saturates: 0,
          carbohydrate: 1,
          sugars: 0,
          protein: 1,
          salt: 0,
        },
      },
      'fixture',
    );
  const settings = store.settings();
  store.saveSettings(
    {
      ...settings,
      legalApproved: true,
      shippingApproved: true,
      ukApproved: true,
      ukDeliveryMode: 'uk-stock',
      legalName: 'Fixture Seller',
      address: 'Fixture address',
      email: 'help@example.com',
      representative: 'Fixture Representative',
      returnAddress: 'Fixture returns',
      policies: {
        de: {
          terms: 'Fixture terms',
          privacy: 'Fixture privacy',
          withdrawal: 'Fixture withdrawal',
          shipping: 'Fixture shipping',
        },
        en: {
          terms: 'Fixture terms',
          privacy: 'Fixture privacy',
          withdrawal: 'Fixture withdrawal',
          shipping: 'Fixture shipping',
        },
      },
    },
    settings.version,
    'fixture',
  );
  await new Promise((resolve) => {
    server = x.app.listen(0, '127.0.0.1', resolve);
  });
  base = 'http://127.0.0.1:' + server.address().port + '/api';
  const login = await post(
    '/admin/login',
    { email: 'owner@example.com', password: 'test-owner-password-1234' },
    { Origin: origin },
  );
  assert.equal(login.status, 200);
  cookie = login.headers.get('set-cookie').split(';')[0];
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
});
test('default launch is closed and food data cannot be marked verified while incomplete', () => {
  assert.equal(loadConfig({ NODE_ENV: 'test' }).CHECKOUT_ENABLED, false);
  assert.throws(() => productSchema.parse({ ...store.product('peri-peri'), nutrition: null }));
  assert.throws(() => settingsSchema.parse({ ...store.settings(), legalName: '' }));
});
test('staff auth is cookie based, rate limited and rejects cross-origin writes', async () => {
  assert.equal((await fetch(base + '/admin/products')).status, 401);
  const r = await fetch(base + '/admin/products/peri-peri', {
    method: 'PUT',
    headers: { Cookie: cookie, Origin: 'https://evil.invalid', 'Content-Type': 'application/json' },
    body: JSON.stringify(store.product('peri-peri')),
  });
  assert.equal(r.status, 403);
  const login = await post(
    '/admin/login',
    { email: 'owner@example.com', password: 'wrong' },
    { Origin: origin },
  );
  assert.equal(login.status, 401);
});
test('checkout reserves stock, prices on server, and cannot be fulfilled before payment', async () => {
  const before = store.product('peri-peri');
  const res = await checkout({ ...draft(), total: 1 });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.order.total, 1097);
  assert.equal(body.order.status, 'pending_payment');
  assert.equal(store.product('peri-peri').reserved, before.reserved + 2);
  const r = await admin('/orders/' + body.order.orderNumber, 'PATCH', { status: 'packed' });
  assert.equal(r.status, 409);
});
test('replayed checkout uses one provider session and mismatch is rejected', async () => {
  const key = crypto.randomUUID();
  const count = calls;
  const a = await (await checkout(draft(), key)).json();
  const b = await (await checkout(draft(), key)).json();
  assert.equal(a.order.orderNumber, b.order.orderNumber);
  assert.equal(calls, count + 1);
  assert.equal((await checkout(draft({ note: 'changed' }), key)).status, 409);
});
test('ambiguous provider failure recovers with the same order and reservation', async () => {
  const key = crypto.randomUUID();
  const before = store.product('cream-onion');
  failAfterCreate = true;
  const body = draft({ items: [{ productId: 'cream-onion', quantity: 2 }] });
  assert.equal((await checkout(body, key)).status, 500);
  assert.equal(store.product('cream-onion').reserved, before.reserved + 2);
  const count = calls;
  const retry = await checkout(body, key);
  assert.equal(retry.status, 201);
  assert.equal(calls, count);
  assert.equal(store.product('cream-onion').reserved, before.reserved + 2);
});
test('signed payment webhooks are idempotent and stock sells once', async () => {
  const before = store.product('four-cheese');
  const r = await (
    await checkout(draft({ items: [{ productId: 'four-cheese', quantity: 2 }] }))
  ).json();
  const o = store.order(r.order.orderNumber);
  const s = sessions.get(o.sessionId);
  s.payment_status = 'paid';
  s.status = 'complete';
  const event = eventFor(s);
  assert.equal((await webhook(event)).status, 200);
  assert.equal((await webhook(event)).status, 200);
  assert.equal(store.order(o.orderNumber).status, 'confirmed');
  assert.equal(store.product('four-cheese').stock, before.stock - 2);
  assert.equal(store.product('four-cheese').reserved, before.reserved);
  assert.equal(
    db.prepare('SELECT count(*) AS n FROM outbox WHERE id LIKE ?').get(o.id + '-paid-%').n,
    2,
  );
});
test('forged, incorrect-amount and incorrect-mode webhooks do not confirm orders', async () => {
  const r = await (await checkout()).json();
  const o = store.order(r.order.orderNumber);
  const s = sessions.get(o.sessionId);
  assert.equal(
    (
      await fetch(base + '/webhooks/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Stripe-Signature': 't=1,v1=bad' },
        body: '{}',
      })
    ).status,
    400,
  );
  s.payment_status = 'paid';
  s.status = 'complete';
  s.amount_total++;
  assert.equal((await webhook(eventFor(s))).status, 409);
  s.amount_total--;
  const e = eventFor(s);
  e.livemode = true;
  assert.equal((await webhook(e)).status, 400);
  assert.equal(store.order(o.orderNumber).status, 'pending_payment');
  s.payment_status = 'unpaid';
  s.status = 'open';
});
test('expiry releases reservations exactly once and failed async payment releases stock', async () => {
  const before = store.product('cheese-herbs');
  const a = await (
    await checkout(draft({ items: [{ productId: 'cheese-herbs', quantity: 2 }] }))
  ).json();
  const o = store.order(a.order.orderNumber);
  const s = sessions.get(o.sessionId);
  s.status = 'expired';
  const e = { ...eventFor(s), type: 'checkout.session.expired' };
  await webhook(e);
  await webhook({ ...e, id: 'evt_' + crypto.randomUUID() });
  assert.equal(store.product('cheese-herbs').reserved, before.reserved);
  assert.equal(store.product('cheese-herbs').stock, before.stock);
  const b = await (
    await checkout(draft({ items: [{ productId: 'cheese-herbs', quantity: 2 }] }))
  ).json();
  const s2 = sessions.get(store.order(b.order.orderNumber).sessionId);
  s2.status = 'complete';
  await webhook({ ...eventFor(s2), type: 'checkout.session.async_payment_failed' });
  assert.equal(store.product('cheese-herbs').reserved, before.reserved);
});
test('stock limits and stale product changes are rejected', async () => {
  const p = store.product('protein-chocolate');
  store.saveProduct({ ...p, stock: 1 }, 'fixture');
  const body = draft({ items: [{ productId: p.id, quantity: 1 }] });
  const a = await checkout(body);
  assert.equal(a.status, 201);
  assert.equal((await checkout(body)).status, 409);
  const edit = await admin('/products/' + p.id, 'PUT', { ...p, stock: 50 });
  assert.equal(edit.status, 409);
});
test('London checkout accepts UK address, rejects Northern Ireland and shows euros', async () => {
  const r = await checkout(
    draft({
      market: 'GB',
      shippingMethod: 'express',
      customer: { ...customer, postalCode: 'SW1A 1AA', city: 'London', phone: '+447911123456' },
    }),
  );
  assert.equal(r.status, 201);
  const { order } = await r.json();
  assert.equal(order.currency, 'EUR');
  assert.equal(order.shipping, 1199);
  assert.equal(
    (await checkout(draft({ market: 'GB', customer: { ...customer, postalCode: 'BT1 1AA' } })))
      .status,
    400,
  );
});
test('paid order fulfilment needs tracking; refunds are idempotent and do not auto-restock food', async () => {
  const r = await (
    await checkout(draft({ items: [{ productId: 'asian-pepper-garlic', quantity: 2 }] }))
  ).json();
  const o = store.order(r.order.orderNumber);
  const s = sessions.get(o.sessionId);
  s.payment_status = 'paid';
  s.status = 'complete';
  await webhook(eventFor(s));
  assert.equal(
    (await admin('/orders/' + o.orderNumber, 'PATCH', { status: 'packed' })).status,
    200,
  );
  assert.equal(
    (await admin('/orders/' + o.orderNumber, 'PATCH', { status: 'shipped' })).status,
    400,
  );
  assert.equal(
    (
      await admin('/orders/' + o.orderNumber, 'PATCH', {
        status: 'shipped',
        trackingCode: 'ABC',
        trackingUrl: 'https://example.com/parcel',
      })
    ).status,
    200,
  );
  const stock = store.product('asian-pepper-garlic').stock;
  assert.equal((await admin('/orders/' + o.orderNumber + '/refund', 'POST')).status, 200);
  assert.equal((await admin('/orders/' + o.orderNumber + '/refund', 'POST')).status, 200);
  assert.equal(store.order(o.orderNumber).status, 'refunded');
  assert.equal(store.product('asian-pepper-garlic').stock, stock);
});
test('order lookup hides addresses and needs matching private details', async () => {
  const r = await (await checkout()).json();
  const o = store.order(r.order.orderNumber);
  const wrong = await post('/orders/lookup', { orderNumber: o.orderNumber, phone: '123456789' });
  assert.equal(wrong.status, 404);
  const good = await post('/orders/lookup', { orderNumber: o.orderNumber, token: o.accessToken });
  assert.equal(good.status, 200);
  assert.equal((await good.json()).order.customer.email, undefined);
});
test('newsletter is double opt-in and explicit consent is required', async () => {
  assert.equal(
    (await post('/newsletter', { email: 'newsletter@example.com', language: 'en', consent: false }))
      .status,
    400,
  );
  assert.equal(
    (await post('/newsletter', { email: 'newsletter@example.com', language: 'en', consent: true }))
      .status,
    202,
  );
  const job = db
    .prepare(
      "SELECT data FROM outbox WHERE kind='newsletter-confirm' ORDER BY created_at DESC LIMIT 1",
    )
    .get();
  const token = JSON.parse(job.data).token;
  assert.equal(
    db.prepare('SELECT state FROM subscribers WHERE email=?').get('newsletter@example.com').state,
    'pending',
  );
  assert.equal((await post('/newsletter/confirm', { token })).status, 200);
  assert.equal((await post('/newsletter/confirm', { token })).status, 200);
  assert.equal((await post('/newsletter/unsubscribe', { token })).status, 200);
  assert.equal(
    db.prepare('SELECT state FROM subscribers WHERE email=?').get('newsletter@example.com').state,
    'unsubscribed',
  );
});
test('withdrawal works without login and duplicate requests give one receipt', async () => {
  const key = crypto.randomUUID();
  const body = {
    name: 'Test Customer',
    orderNumber: 'External contract',
    email: 'customer@example.com',
    details: 'All goods',
    confirm: true,
  };
  const a = await post('/withdrawals', body, { 'Idempotency-Key': key });
  const first = await a.json();
  const b = await post('/withdrawals', body, { 'Idempotency-Key': key });
  assert.equal((await b.json()).id, first.id);
  assert.equal(db.prepare('SELECT count(*) AS n FROM withdrawals WHERE id=?').get(first.id).n, 1);
  assert.ok(first.receivedAt);
});
test('staff can manage products but cannot refund, change legal settings or create owners', async () => {
  assert.equal(
    (
      await admin('/users', 'POST', {
        email: 'staff@example.com',
        password: 'test-staff-password-1234',
        role: 'staff',
      })
    ).status,
    201,
  );
  const r = await post(
    '/admin/login',
    { email: 'staff@example.com', password: 'test-staff-password-1234' },
    { Origin: origin },
  );
  const staffCookie = r.headers.get('set-cookie').split(';')[0];
  assert.equal(
    (await fetch(base + '/admin/products', { headers: { Cookie: staffCookie } })).status,
    200,
  );
  assert.equal(
    (
      await fetch(base + '/admin/settings', {
        method: 'PUT',
        headers: { Cookie: staffCookie, Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify(store.settings()),
      })
    ).status,
    403,
  );
});
test('archiving removes product from storefront but preserves historical order snapshots', async () => {
  const p = store.product('butter-chicken');
  const r = await (await checkout(draft({ items: [{ productId: p.id, quantity: 2 }] }))).json();
  const current = store.product(p.id);
  assert.equal(
    (await admin('/products/' + p.id, 'DELETE', { version: current.version })).status,
    200,
  );
  const list = await (await fetch(base + '/products')).json();
  assert.equal(
    list.some((x) => x.id === p.id),
    false,
  );
  assert.equal(store.order(r.order.orderNumber).lines[0].name, p.fullName);
});
test('sent notification jobs are not re-enqueued on replay', async () => {
  store.enqueue('job-fixture', 'order-email', {
    to: 'x@example.com',
    order: store.listOrders().orders[0],
    token: 'fixture',
  });
  await worker.drain();
  assert.equal(db.prepare('SELECT state FROM outbox WHERE id=?').get('job-fixture').state, 'sent');
  await worker.drain();
  assert.equal(db.prepare('SELECT attempts FROM outbox WHERE id=?').get('job-fixture').attempts, 1);
});
test('unknown routes are JSON errors; owner cannot disable itself', async () => {
  assert.equal((await fetch(base + '/nope')).status, 404);
  assert.equal((await admin('/users/owner@example.com', 'DELETE')).status, 409);
});
test('simultaneous buyers cannot reserve the same final stock unit', async () => {
  const p = store.product('protein-mango');
  store.saveProduct({ ...p, stock: 1 }, 'fixture');
  const body = draft({ items: [{ productId: p.id, quantity: 1 }] });
  const responses = await Promise.all([checkout(body), checkout(body)]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
  assert.equal(store.product(p.id).reserved, 1);
});
test('a paid session orphaned by a connection failure is recovered after an hour', async () => {
  failAfterCreate = true;
  const key = crypto.randomUUID();
  const before = store.product('protein-royal-cream');
  assert.equal(
    (await checkout(draft({ items: [{ productId: before.id, quantity: 1 }] }), key)).status,
    500,
  );
  const o = store.byKey(key);
  assert.equal(o.sessionId, null);
  const s = byOrder.get(o.id);
  s.payment_status = 'paid';
  s.status = 'complete';
  db.prepare('UPDATE commerce_orders SET created_at=? WHERE id=?').run(
    new Date(Date.now() - 7200000).toISOString(),
    o.id,
  );
  const result = await service.reconcile();
  assert.deepEqual(result.failures, []);
  assert.equal(store.byId(o.id).status, 'confirmed');
  assert.equal(store.product(before.id).stock, before.stock - 1);
  await service.reconcile();
  assert.equal(store.product(before.id).stock, before.stock - 1);
});
test('order CSV escapes spreadsheet formula input and includes immutable order lines', async () => {
  const r = await (
    await checkout(draft({ customer: { ...customer, street: '=HYPERLINK("bad")' } }))
  ).json();
  const output = await (await admin('/orders.csv')).text();
  assert.ok(output.includes(r.order.orderNumber));
  assert.ok(output.includes("'="));
  assert.ok(output.includes('Peri Peri'));
});
