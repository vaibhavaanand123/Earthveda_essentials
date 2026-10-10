import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import { createStore } from './db/store.js';
import { createPayments } from './services/payments.js';
import { createNotificationWorker } from './services/notifications.js';
import { createCommerceService } from './services/commerceService.js';
import { createAuth } from './services/auth.js';
import { apiRouter } from './http/routes.js';
import { errorHandler, requestContext } from './http/middleware.js';

const STATIC_PAGES = [
  '/',
  '/shop',
  '/about',
  '/faq',
  '/contact',
  '/shipping',
  '/returns',
  '/privacy',
  '/terms',
  '/imprint',
  '/track',
];

/** Composition root: wires repositories → services → HTTP. Easy to test with an in-memory DB. */
export function createApp({ config, db, logger, payments: providedPayments, notificationFetcher }) {
  const store = createStore(db);
  const payments = providedPayments || createPayments(config);
  const service = createCommerceService(store, payments, config);
  const auth = createAuth(store, config);
  const ready = auth.bootstrap();
  const worker = createNotificationWorker(store, config, logger, { fetcher: notificationFetcher });
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(requestContext(logger));
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:'],
          'font-src': ["'self'"],
          'connect-src': ["'self'"],
          'frame-ancestors': ["'none'"],
          'form-action': ["'self'"],
          'upgrade-insecure-requests': config.isProduction ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      strictTransportSecurity: config.isProduction
        ? { maxAge: 31536000, includeSubDomains: true }
        : false,
    }),
  );
  app.use(compression());
  app.use((_req, res, next) => {
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.post(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json', limit: '1mb' }),
    async (req, res, next) => {
      try {
        const event = payments.verifyWebhook(req.body, req.get('stripe-signature'));
        await service.webhook(event);
        res.json({ received: true });
      } catch (error) {
        if (error.type === 'StripeSignatureVerificationError')
          return res
            .status(400)
            .json({ error: { code: 'invalid_signature', message: 'Invalid webhook signature' } });
        next(error);
      }
    },
  );
  app.use('/api', express.json({ limit: '100kb' }));
  app.use('/api', apiRouter({ config, store, service, auth, worker }));

  const site = config.publicSiteUrl;
  app.get('/robots.txt', (_req, res) => {
    res
      .type('text/plain')
      .send(
        [
          'User-agent: *',
          'Disallow: /admin',
          'Disallow: /checkout',
          'Disallow: /cart',
          'Disallow: /api/',
          site ? `Sitemap: ${site}/sitemap.xml` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      );
  });
  app.get('/sitemap.xml', (_req, res) => {
    if (!site) return res.status(404).end();
    const urls = [
      ...STATIC_PAGES,
      ...store
        .products()
        .filter((p) => p.published)
        .map((p) => `/product/${p.slug}`),
    ];
    res
      .type('application/xml')
      .send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
          .map((u) => `<url><loc>${site}${u}</loc></url>`)
          .join('')}</urlset>`,
      );
  });

  app.use(
    '/images',
    express.static(path.join(path.dirname(config.databasePath), 'images'), {
      maxAge: '7d',
      index: false,
    }),
  );
  // Built storefront: hashed assets are immutable; HTML is always revalidated.
  const indexFile = path.join(config.staticDir, 'index.html');
  if (fs.existsSync(indexFile)) {
    app.use(
      express.static(config.staticDir, {
        index: false,
        setHeaders(res, file) {
          if (file.includes(`${path.sep}assets${path.sep}`))
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          else if (file.includes(`${path.sep}images${path.sep}`))
            res.setHeader('Cache-Control', 'public, max-age=604800');
        },
      }),
    );
    app.get(/^\/(?!api\/).*/, (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      if (req.path.startsWith('/admin')) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.sendFile(indexFile);
    });
  }

  app.use(errorHandler(logger));
  return { app, store, service, auth, worker, ready };
}
