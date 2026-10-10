import path from 'node:path';
import { z } from 'zod';
const flag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');
const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    HOST: z.string().default('0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65535).default(8787),
    DATABASE_PATH: z.string().default('./data/earthveda.sqlite'),
    STATIC_DIR: z.string().default('./dist'),
    PUBLIC_SITE_URL: z.string().url().default('http://localhost:5173'),
    CHECKOUT_ENABLED: flag,
    STRIPE_SECRET_KEY: z.string().default(''),
    STRIPE_WEBHOOK_SECRET: z.string().default(''),
    STRIPE_LIVE_MODE: flag,
    RESEND_API_KEY: z.string().default(''),
    EMAIL_FROM: z.string().default(''),
    TEAM_EMAIL: z.string().email().optional().or(z.literal('')).default(''),
    WHATSAPP_ACCESS_TOKEN: z.string().default(''),
    WHATSAPP_PHONE_ID: z.string().default(''),
    WHATSAPP_TEMPLATE: z.string().default('earthveda_order_update'),
    WHATSAPP_TEMPLATE_LANG: z.string().default('en'),
    WHATSAPP_GRAPH_VERSION: z
      .string()
      .regex(/^v[0-9]+\.[0-9]+$/)
      .default('v23.0'),
    TEAM_WHATSAPP: z
      .string()
      .regex(/^[0-9]*$/)
      .default(''),
    TEAM_WHATSAPP_OPT_IN: flag,
    ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional().or(z.literal('')).default(''),
    ADMIN_BOOTSTRAP_PASSWORD: z.string().default(''),
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    ORDER_RATE_LIMIT: z.coerce.number().int().min(1).max(100000).default(10),
  })
  .superRefine((v, ctx) => {
    if (v.NODE_ENV === 'production' && !v.PUBLIC_SITE_URL.startsWith('https://'))
      ctx.addIssue({ code: 'custom', message: 'PUBLIC_SITE_URL must use HTTPS.' });
    if (
      v.CHECKOUT_ENABLED &&
      (!v.STRIPE_SECRET_KEY ||
        !v.STRIPE_WEBHOOK_SECRET ||
        !v.RESEND_API_KEY ||
        !v.EMAIL_FROM ||
        !v.TEAM_EMAIL)
    )
      ctx.addIssue({
        code: 'custom',
        message:
          'Checkout needs Stripe keys, webhook secret, verified email sender and team recipient.',
      });
    if (v.ADMIN_BOOTSTRAP_PASSWORD && v.ADMIN_BOOTSTRAP_PASSWORD.length < 14)
      ctx.addIssue({ code: 'custom', message: 'Bootstrap password needs at least 14 characters.' });
    if (
      v.STRIPE_SECRET_KEY &&
      !v.STRIPE_SECRET_KEY.startsWith(v.STRIPE_LIVE_MODE ? 'sk_live_' : 'sk_test_')
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Stripe secret key and STRIPE_LIVE_MODE must use the same mode.',
      });
    if (v.ADMIN_BOOTSTRAP_PASSWORD && !v.ADMIN_BOOTSTRAP_EMAIL)
      ctx.addIssue({
        code: 'custom',
        message: 'Bootstrap password requires an individual owner email.',
      });
  });
export function loadConfig(env = process.env) {
  const v = schema.parse(env);
  return {
    ...v,
    env: v.NODE_ENV,
    isProduction: v.NODE_ENV === 'production',
    host: v.HOST,
    port: v.PORT,
    databasePath: v.DATABASE_PATH === ':memory:' ? ':memory:' : path.resolve(v.DATABASE_PATH),
    staticDir: path.resolve(v.STATIC_DIR),
    publicSiteUrl: v.PUBLIC_SITE_URL.replace(/\/$/, ''),
    trustProxy: v.TRUST_PROXY,
    logLevel: v.LOG_LEVEL,
    orderRateLimit: v.ORDER_RATE_LIMIT,
  };
}
