import crypto from 'node:crypto';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import {
  checkoutSchema,
  productSchema,
  settingsSchema,
  statusSchema,
  withdrawalSchema,
} from '../services/schemas.js';
import { AppError, badRequest, notFound } from '../lib/errors.js';
import { noStore, validate } from './middleware.js';
import { hash } from '../db/store.js';
const limiter = (limit) =>
  rateLimit({
    windowMs: 600000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: { code: 'rate_limited', message: 'Too many requests. Please try again later.' },
    },
  });
const keyFor = (req) => {
  const key = req.get('Idempotency-Key') || '';
  if (!/^[0-9a-f-]{36}$/i.test(key))
    throw badRequest('idempotency_required', 'A checkout request key is required.');
  return key;
};
const csv = (v) => {
  let s = String(v ?? '');
  if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};
export function apiRouter({ config, store, service, auth, worker }) {
  const api = Router();
  api.get('/health', noStore, (_req, res) => {
    store.db.prepare('SELECT 1').get();
    res.json({ status: 'ok' });
  });
  api.get('/config', noStore, (_req, res) => {
    const s = store.settings();
    res.json({
      settings: s,
      checkoutEnabled: config.CHECKOUT_ENABLED && s.legalApproved && s.shippingApproved,
      ukEnabled: s.ukApproved,
      whatsappEnabled: !!(config.WHATSAPP_ACCESS_TOKEN && config.WHATSAPP_PHONE_ID),
      paymentMethods: [
        'Visa',
        'Mastercard',
        'American Express',
        'PayPal',
        'Klarna',
        'Apple Pay',
        'Google Pay',
      ],
    });
  });
  api.get('/products', noStore, (_req, res) =>
    res.json(
      store
        .products()
        .filter((p) => p.published)
        .map((p) => ({
          ...p,
          available: p.available && p.stock - p.reserved > 0,
          stock: Math.max(0, p.stock - p.reserved),
          reserved: undefined,
        })),
    ),
  );
  api.post(
    '/orders',
    noStore,
    limiter(config.orderRateLimit),
    validate(checkoutSchema),
    async (req, res) => res.status(201).json(await service.checkout(req.valid.body, keyFor(req))),
  );
  api.get('/checkout/status', noStore, limiter(60), async (req, res) => {
    const id = z
      .string()
      .regex(/^cs_(test_|live_)?[a-zA-Z0-9]+$/)
      .max(300)
      .parse(req.query.session_id);
    res.json({ order: await service.status(id) });
  });
  api.post(
    '/orders/lookup',
    noStore,
    limiter(20),
    validate(
      z.object({
        orderNumber: z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^EV-[0-9A-F]{8,12}$/),
        phone: z.string().max(25).optional(),
        token: z.string().max(100).optional(),
      }),
    ),
    (req, res) => res.json({ order: service.lookup(req.valid.body) }),
  );
  api.post(
    '/newsletter',
    noStore,
    limiter(5),
    validate(
      z.object({
        email: z
          .string()
          .trim()
          .email()
          .max(254)
          .transform((v) => v.toLowerCase()),
        language: z.enum(['de', 'en']).default('de'),
        consent: z.literal(true),
        website: z.string().max(0).default(''),
      }),
    ),
    (req, res) => {
      if (!config.RESEND_API_KEY || !store.settings().legalApproved)
        throw new AppError(503, 'newsletter_pending', 'Newsletter registration opens soon.');
      const { email, language } = req.valid.body;
      const old = store.db.prepare('SELECT * FROM subscribers WHERE email=?').get(email);
      if (!old || old.state !== 'confirmed') {
        const token = crypto.randomBytes(32).toString('base64url');
        store.tx(() => {
          store.db
            .prepare(
              "INSERT INTO subscribers(email,language,state,token_hash,expires_at,consent_at,policy_version) VALUES(?,?,'pending',?,?,?,?) ON CONFLICT(email) DO UPDATE SET language=excluded.language,state='pending',token_hash=excluded.token_hash,expires_at=excluded.expires_at,consent_at=excluded.consent_at,policy_version=excluded.policy_version",
            )
            .run(
              email,
              language,
              hash(token),
              Date.now() + 86400000,
              new Date().toISOString(),
              store.settings().policyVersion,
            );
          store.enqueue('newsletter-' + hash(token), 'newsletter-confirm', {
            to: email,
            token,
            language,
          });
        });
      }
      res.status(202).json({ message: 'Check your email to confirm your subscription.' });
    },
  );
  api.post(
    '/newsletter/confirm',
    noStore,
    limiter(20),
    validate(z.object({ token: z.string().min(30).max(100) })),
    (req, res) => {
      const result = store.db
        .prepare(
          "UPDATE subscribers SET state='confirmed',confirmed_at=? WHERE token_hash=? AND expires_at>? AND state='pending'",
        )
        .run(new Date().toISOString(), hash(req.valid.body.token), Date.now());
      const row = store.db
        .prepare('SELECT state FROM subscribers WHERE token_hash=?')
        .get(hash(req.valid.body.token));
      if (!result.changes && row?.state !== 'confirmed')
        throw badRequest('expired', 'This confirmation link has expired.');
      res.json({ message: 'Subscription confirmed. You can unsubscribe at any time.' });
    },
  );
  api.post(
    '/newsletter/unsubscribe',
    noStore,
    limiter(20),
    validate(z.object({ token: z.string().min(30).max(100) })),
    (req, res) => {
      store.db
        .prepare("UPDATE subscribers SET state='unsubscribed' WHERE token_hash=?")
        .run(hash(req.valid.body.token));
      res.json({ message: 'You have been unsubscribed.' });
    },
  );
  api.post('/withdrawals', noStore, limiter(10), validate(withdrawalSchema), (req, res) => {
    if (!config.RESEND_API_KEY || !config.EMAIL_FROM)
      throw new AppError(503, 'mail_pending', 'Please send your declaration to our contact email.');
    const key = keyFor(req);
    let row = store.db.prepare('SELECT data FROM withdrawals WHERE idempotency_key=?').get(key);
    if (row) return res.json(JSON.parse(row.data));
    const data = {
      ...req.valid.body,
      id: crypto.randomUUID(),
      receivedAt: new Date().toISOString(),
    };
    store.tx(() => {
      store.db
        .prepare('INSERT INTO withdrawals(id,idempotency_key,data,created_at) VALUES(?,?,?,?)')
        .run(data.id, key, JSON.stringify(data), data.receivedAt);
      store.enqueue(data.id + '-receipt', 'withdrawal-email', { ...data, to: data.email });
      if (config.TEAM_EMAIL)
        store.enqueue(data.id + '-team', 'withdrawal-email', { ...data, to: config.TEAM_EMAIL });
    });
    res.status(201).json({
      id: data.id,
      receivedAt: data.receivedAt,
      name: data.name,
      orderNumber: data.orderNumber,
      email: data.email,
      details: data.details,
    });
  });
  const admin = Router();
  admin.use(noStore, limiter(120));
  admin.use((req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (req.get('origin') !== new URL(config.publicSiteUrl).origin)
      return next(new AppError(403, 'origin', 'Request origin not permitted.'));
    next();
  });
  admin.post(
    '/login',
    limiter(10),
    validate(
      z.object({ email: z.string().email().max(254), password: z.string().min(1).max(256) }),
    ),
    async (req, res) => {
      const { token, user } = await auth.login(req.valid.body.email, req.valid.body.password);
      res.cookie('ev_session', token, {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'strict',
        maxAge: 8 * 3600000,
        path: '/api/admin',
      });
      res.json({ user });
    },
  );
  admin.use(auth.middleware());
  admin.get('/me', (req, res) => res.json({ user: req.user }));
  admin.post('/logout', (req, res) => {
    store.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(req.sessionHash);
    res.clearCookie('ev_session', {
      path: '/api/admin',
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'strict',
    });
    res.sendStatus(204);
  });
  admin.get(
    '/orders',
    validate(
      z.object({
        status: z.string().max(30).default(''),
        search: z.string().max(80).default(''),
        limit: z.coerce.number().int().min(1).max(200).default(50),
        offset: z.coerce.number().int().min(0).max(1000000).default(0),
      }),
      'query',
    ),
    (req, res) => res.json(store.listOrders(req.valid.query)),
  );
  admin.get('/orders.csv', async (req, res) => {
    const lastRow = store.db.prepare('SELECT max(rowid) AS n FROM commerce_orders').get().n || 0;
    res.type('text/csv').attachment('earthveda-orders.csv');
    const controller = new AbortController();
    res.on('close', () => controller.abort());
    const write = async (line) => {
      if (res.destroyed) return;
      if (!res.write(line + '\r\n')) {
        try {
          await once(res, 'drain', { signal: controller.signal });
        } catch (e) {
          if (e.name !== 'AbortError') throw e;
        }
      }
    };
    await write(
      ['Order', 'Status', 'Email', 'Phone', 'Address', 'Market', 'Total EUR', 'Payment', 'Items']
        .map(csv)
        .join(','),
    );
    let cursor = 0;
    while (cursor < lastRow && !res.destroyed) {
      const rows = store.db
        .prepare(
          'SELECT rowid AS cursor,id FROM commerce_orders WHERE rowid>? AND rowid<=? ORDER BY rowid LIMIT 200',
        )
        .all(cursor, lastRow);
      if (!rows.length) break;
      for (const row of rows) {
        if (res.destroyed) break;
        const o = store.byId(row.id);
        await write(
          [
            o.orderNumber,
            o.status,
            o.customer.email,
            o.customer.phone,
            [o.customer.street, o.customer.unit, o.customer.postalCode, o.customer.city].join(', '),
            o.market,
            (o.total / 100).toFixed(2),
            o.paymentStatus,
            o.lines.map((l) => l.quantity + ' × ' + l.name).join('; '),
          ]
            .map(csv)
            .join(','),
        );
        cursor = row.cursor;
      }
    }
    res.end();
  });
  admin.patch('/orders/:number', validate(statusSchema), (req, res) =>
    res.json({ order: service.updateStatus(req.params.number, req.valid.body, req.user.email) }),
  );
  admin.post('/orders/:number/refund', auth.middleware('owner'), async (req, res) =>
    res.json({ order: await service.refund(req.params.number, req.user.email) }),
  );
  admin.post(
    '/images',
    express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '2mb' }),
    (req, res) => {
      const b = req.body;
      let ext;
      if (Buffer.isBuffer(b) && b.length > 12) {
        if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ext = 'png';
        else if (b[0] === 255 && b[1] === 216 && b[2] === 255) ext = 'jpg';
        else if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP')
          ext = 'webp';
      }
      if (!ext) throw badRequest('invalid_image', 'Upload a PNG, JPEG or WebP image.');
      const name = 'upload-' + hash(b).slice(0, 32) + '.' + ext;
      const dir = path.join(path.dirname(config.databasePath), 'images');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, name), b, { mode: 0o600 });
      store.audit(req.user.email, 'image.uploaded', name);
      res.status(201).json({ path: '/images/' + name });
    },
  );
  admin.get('/products', (_req, res) => res.json(store.products()));
  admin.post('/products', validate(productSchema), (req, res) => {
    if (store.product(req.valid.body.id)) throw new AppError(409, 'exists', 'Product ID exists.');
    res.status(201).json(store.saveProduct(req.valid.body, req.user.email));
  });
  admin.put('/products/:id', validate(productSchema), (req, res) => {
    if (req.params.id !== req.valid.body.id) throw badRequest('id', 'Product ID mismatch');
    res.json(store.saveProduct(req.valid.body, req.user.email));
  });
  admin.delete('/products/:id', validate(z.object({ version: z.number().int() })), (req, res) =>
    res.json(store.archiveProduct(req.params.id, req.valid.body.version, req.user.email)),
  );
  admin.get('/settings', (_req, res) => res.json(store.settings()));
  admin.put('/settings', auth.middleware('owner'), (req, res) => {
    const version = z.number().int().parse(req.body.version);
    res.json(store.saveSettings(settingsSchema.parse(req.body), version, req.user.email));
  });
  admin.get('/notifications', (_req, res) => res.json(worker.queueStatus()));
  admin.post('/notifications/:id/retry', auth.middleware('owner'), (req, res) => {
    const r = store.db
      .prepare(
        "UPDATE outbox SET state='pending',attempts=0,next_at=0 WHERE id=? AND state='failed'",
      )
      .run(req.params.id);
    if (!r.changes) throw badRequest('retry', 'Only failed jobs can be retried.');
    store.audit(req.user.email, 'notification.retry', req.params.id);
    res.sendStatus(204);
  });
  admin.post('/reconcile', auth.middleware('owner'), async (_req, res) => {
    res.json(await service.reconcile());
  });
  admin.get('/withdrawals', (_req, res) =>
    res.json(
      store.db
        .prepare('SELECT data FROM withdrawals ORDER BY created_at DESC LIMIT 200')
        .all()
        .map((r) => JSON.parse(r.data)),
    ),
  );
  admin.get('/audit', auth.middleware('owner'), (_req, res) =>
    res.json(store.db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 200').all()),
  );
  admin.get('/subscribers.csv', auth.middleware('owner'), (_req, res) => {
    const rows = store.db
      .prepare(
        "SELECT email,language,confirmed_at,policy_version FROM subscribers WHERE state='confirmed'",
      )
      .all();
    res
      .type('text/csv')
      .attachment('subscribers.csv')
      .send(
        [
          ['email', 'language', 'confirmed_at', 'policy_version'],
          ...rows.map((r) => Object.values(r)),
        ]
          .map((r) => r.map(csv).join(','))
          .join('\r\n'),
      );
  });
  admin.get('/users', auth.middleware('owner'), (_req, res) =>
    res.json(store.db.prepare('SELECT email,role,active FROM staff').all()),
  );
  admin.post(
    '/users',
    auth.middleware('owner'),
    validate(
      z.object({
        email: z.string().email().max(254),
        password: z.string().min(14).max(256),
        role: z.enum(['owner', 'staff']),
      }),
    ),
    async (req, res) => {
      await auth.createUser(req.valid.body, req.user.email);
      res.sendStatus(201);
    },
  );
  admin.delete('/users/:email', auth.middleware('owner'), (req, res) => {
    auth.disableUser(req.params.email, req.user.email);
    res.sendStatus(204);
  });
  api.use('/admin', admin);
  api.use((_req, _res, next) => next(notFound('Unknown API route.')));
  return api;
}
