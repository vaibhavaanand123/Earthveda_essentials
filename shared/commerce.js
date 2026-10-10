/** All prices use integer euro cents. Language and delivery country are independent. */
const base = {
  currency: 'EUR',
  locale: 'de-DE',
  minOrderValue: 0,
  paymentMethods: ['stripe'],
  shipping: { flatFee: 499, freeFrom: null },
  deliveryPromise: 'Delivery estimate confirmed at checkout',
};
export const MARKETS = Object.freeze({
  DE: {
    ...base,
    code: 'DE',
    name: 'Germany',
    postal: {
      label: 'Postcode',
      pattern: '^[0-9]{5}$',
      hint: 'Enter a German five digit postcode',
    },
    phone: {
      pattern: '^\\+?[0-9]{7,15}$',
      hint: 'Enter an international phone number',
      dialCode: '49',
    },
  },
  GB: {
    ...base,
    code: 'GB',
    name: 'United Kingdom',
    shipping: { flatFee: 999, freeFrom: null },
    postal: {
      label: 'Postcode',
      pattern: '^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$',
      hint: 'Enter a UK postcode, e.g. SW1A 1AA',
    },
    phone: {
      pattern: '^\\+?[0-9]{7,15}$',
      hint: 'Enter an international phone number',
      dialCode: '44',
    },
  },
});
export const DEFAULT_MARKET = 'DE';
export const PAYMENT_METHODS = {
  stripe: {
    id: 'stripe',
    label: 'Secure online payment',
    detail: {
      DE: 'Cards, PayPal and Klarna where eligible',
      GB: 'Cards, PayPal and Klarna where eligible',
    },
  },
};
export const SHIPPING_OPTIONS = {
  DE: [
    { id: 'standard', label: 'Standard', fee: 499 },
    { id: 'express', label: 'Express', fee: 799 },
  ],
  GB: [
    { id: 'standard', label: 'Standard', fee: 999 },
    { id: 'express', label: 'Express', fee: 1199 },
  ],
};
export const ORDER_LIMITS = { maxQuantityPerLine: 40, maxLines: 25 };
export const ORDER_STATUSES = [
  'pending_payment',
  'confirmed',
  'packed',
  'shipped',
  'delivered',
  'expired',
  'refund_pending',
  'refunded',
];
export const STATUS_TRANSITIONS = {
  pending_payment: [],
  confirmed: ['packed', 'refund_pending'],
  packed: ['shipped', 'refund_pending'],
  shipped: ['delivered', 'refund_pending'],
  delivered: ['refund_pending'],
  expired: [],
  refund_pending: [],
  refunded: [],
};
export const STATUS_LABELS = {
  pending_payment: 'Awaiting payment',
  confirmed: 'Paid / processing',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  expired: 'Payment expired',
  refund_pending: 'Refund processing',
  refunded: 'Refunded',
};
export const isMarket = (v) => typeof v === 'string' && Object.hasOwn(MARKETS, v);
export function formatMoney(minor, market = DEFAULT_MARKET) {
  if (!Number.isSafeInteger(minor)) return 'Price pending';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(minor / 100);
}
