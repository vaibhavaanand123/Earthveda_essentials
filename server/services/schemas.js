import { z } from 'zod';
import { MARKETS, ORDER_LIMITS, ORDER_STATUSES } from '../../shared/commerce.js';
const safe = z
  .string()
  .trim()
  .max(10000)
  .refine((v) => !/[\x00-\x08\x0b-\x1f\x7f]/.test(v), 'Invalid characters');
const text = (min, max) => safe.pipe(z.string().min(min).max(max));
const bilingual = z.object({ de: text(0, 8000), en: text(0, 8000) });
export const checkoutSchema = z
  .object({
    market: z.enum(['DE', 'GB']),
    language: z.enum(['de', 'en']).default('de'),
    shippingMethod: z.enum(['standard', 'express']).default('standard'),
    paymentMethod: z.literal('stripe').default('stripe'),
    items: z
      .array(
        z.object({
          productId: text(1, 80),
          quantity: z.number().int().min(1).max(ORDER_LIMITS.maxQuantityPerLine),
        }),
      )
      .min(1)
      .max(25),
    customer: z.object({
      firstName: text(1, 80),
      lastName: text(1, 80),
      email: z.string().trim().email().max(254),
      phone: text(7, 25),
      street: text(3, 160),
      unit: text(0, 100).default(''),
      landmark: text(0, 100).default(''),
      postalCode: text(3, 10).transform((v) => v.toUpperCase()),
      city: text(2, 100),
    }),
    note: text(0, 300).default(''),
    whatsappOptIn: z.boolean().default(false),
    acceptTerms: z.literal(true),
    website: z.string().max(0).default(''),
  })
  .superRefine((v, c) => {
    if (!new RegExp(MARKETS[v.market].postal.pattern).test(v.customer.postalCode))
      c.addIssue({
        code: 'custom',
        path: ['customer', 'postalCode'],
        message: MARKETS[v.market].postal.hint,
      });
    if (!/^\+?[0-9]{7,15}$/.test(v.customer.phone.replace(/[ ()-]/g, '')))
      c.addIssue({
        code: 'custom',
        path: ['customer', 'phone'],
        message: 'Enter a valid international phone number.',
      });
    if (v.market === 'GB' && /^(BT|GY|JE|IM)/i.test(v.customer.postalCode))
      c.addIssue({
        code: 'custom',
        path: ['customer', 'postalCode'],
        message: 'Delivery is limited to Great Britain.',
      });
  });
const nutrients = z.object({
  energyKj: z.number().nonnegative(),
  energyKcal: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  saturates: z.number().nonnegative(),
  carbohydrate: z.number().nonnegative(),
  sugars: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  salt: z.number().nonnegative(),
});
export const productSchema = z
  .object({
    id: text(1, 80).pipe(z.string().regex(/^[a-z0-9-]+$/)),
    slug: text(1, 100).pipe(z.string().regex(/^[a-z0-9-]+$/)),
    sku: text(1, 80),
    name: text(1, 120),
    fullName: text(1, 200),
    range: z.enum(['makhana', 'protein']),
    category: text(1, 80),
    description: text(1, 2000),
    descriptionDe: text(0, 2000).default(''),
    image: z.string().regex(/^\/images\/[a-zA-Z0-9._-]+\.(webp|png|jpe?g)$/),
    accent: z.string().regex(/^#[0-9a-f]{6}$/i),
    netWeightGrams: z.number().int().positive().nullable(),
    sizeLabel: text(0, 100),
    available: z.boolean(),
    published: z.boolean(),
    complianceReady: z.boolean(),
    stock: z.number().int().min(0).max(1000000),
    prices: z.object({
      DE: z.number().int().min(1).max(1000000),
      GB: z.number().int().min(1).max(1000000),
    }),
    taxRates: z.object({
      DE: z.number().min(0).max(100).nullable(),
      GB: z.number().min(0).max(100).nullable(),
    }),
    ingredients: bilingual,
    allergens: bilingual,
    nutrition: nutrients.nullable(),
    foodOperator: text(0, 500),
    storage: bilingual,
    origin: text(0, 200),
    howToEnjoy: text(0, 1000).default(''),
    highlights: z.array(text(1, 200)).max(8).default([]),
    moments: z.array(z.enum(['desk', 'workout', 'chai', 'travel'])).default([]),
    featured: z.boolean().default(false),
    isNew: z.boolean().default(false),
    version: z.number().int().optional(),
  })
  .superRefine((p, c) => {
    if (
      p.complianceReady &&
      (!p.descriptionDe ||
        !p.netWeightGrams ||
        !p.nutrition ||
        !p.ingredients.de ||
        !p.ingredients.en ||
        !p.allergens.de ||
        !p.allergens.en ||
        !p.storage.de ||
        !p.storage.en ||
        !p.foodOperator ||
        p.taxRates.DE === null ||
        p.taxRates.GB === null)
    )
      c.addIssue({
        code: 'custom',
        message:
          'Verified sale needs weight, ingredients, allergen statement, nutrition, storage, food operator and tax rates for both markets.',
      });
  });
export const statusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: text(0, 300).default(''),
  trackingCode: text(0, 120).default(''),
  trackingUrl: z.string().url().startsWith('https://').optional().or(z.literal('')).default(''),
});
export const withdrawalSchema = z.object({
  name: text(1, 160),
  orderNumber: text(1, 120),
  email: z.string().trim().email().max(254),
  details: text(0, 2000).default(''),
  confirm: z.literal(true),
  website: z.string().max(0).default(''),
});
export const settingsSchema = z
  .object({
    legalName: text(0, 200),
    address: text(0, 500),
    email: z.string().email().or(z.literal('')),
    phone: text(0, 80),
    representative: text(0, 200),
    register: text(0, 200),
    vatId: text(0, 100),
    returnAddress: text(0, 500),
    foodOperator: text(0, 500),
    privacyContact: text(0, 200),
    supervisoryAuthority: text(0, 500),
    retentionPolicy: text(0, 1000),
    processors: text(0, 2000),
    transferSafeguards: text(0, 2000),
    disputeResolution: text(0, 2000),
    accessibilityStatement: text(0, 5000),
    story: bilingual,
    policies: z.object({
      de: z.object({
        terms: text(0, 8000),
        privacy: text(0, 8000),
        withdrawal: text(0, 8000),
        shipping: text(0, 8000),
      }),
      en: z.object({
        terms: text(0, 8000),
        privacy: text(0, 8000),
        withdrawal: text(0, 8000),
        shipping: text(0, 8000),
      }),
    }),
    shipping: z.object({
      DE: z
        .array(
          z.object({
            id: z.enum(['standard', 'express']),
            label: text(1, 80),
            fee: z.number().int().min(499).max(1199),
          }),
        )
        .length(2),
      GB: z
        .array(
          z.object({
            id: z.enum(['standard', 'express']),
            label: text(1, 80),
            fee: z.number().int().min(499).max(1199),
          }),
        )
        .length(2),
    }),
    legalApproved: z.boolean(),
    shippingApproved: z.boolean(),
    ukApproved: z.boolean(),
    ukDeliveryMode: z.enum(['', 'uk-stock', 'ddp']),
    policyVersion: text(1, 60),
  })
  .superRefine((s, c) => {
    if (
      s.legalApproved &&
      (!s.legalName ||
        !s.address ||
        !s.email ||
        !s.representative ||
        !s.returnAddress ||
        !s.policies.de.terms ||
        !s.policies.en.terms ||
        !s.policies.de.privacy ||
        !s.policies.en.privacy ||
        !s.policies.de.withdrawal ||
        !s.policies.en.withdrawal)
    )
      c.addIssue({
        code: 'custom',
        message: 'Complete seller identity and bilingual approved policies before enabling sales.',
      });
    for (const m of ['DE', 'GB'])
      if (new Set(s.shipping[m].map((x) => x.id)).size !== 2)
        c.addIssue({ code: 'custom', message: 'Delivery methods must be unique.' });
    if (s.shippingApproved && (!s.policies.de.shipping || !s.policies.en.shipping))
      c.addIssue({
        code: 'custom',
        message:
          'Add bilingual delivery timing, charges and destination restrictions before approving shipping.',
      });
    if (s.ukApproved && !s.ukDeliveryMode)
      c.addIssue({ code: 'custom', message: 'Confirm UK stock or duties paid fulfilment.' });
  });
