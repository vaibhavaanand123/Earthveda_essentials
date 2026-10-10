import { MARKETS, ORDER_LIMITS, SHIPPING_OPTIONS, PAYMENT_METHODS } from './commerce.js';
import { priceFor } from './catalog.js';
export class QuoteError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
export function shippingFor(subtotal, market, method = 'standard') {
  const option = SHIPPING_OPTIONS[market]?.find((o) => o.id === method);
  if (!option)
    throw new QuoteError('shipping_unavailable', 'Choose an available delivery service.');
  return subtotal === 0 ? 0 : option.fee;
}
export function quoteOrder(requested, market, resolveProduct, method = 'standard') {
  if (!MARKETS[market])
    throw new QuoteError('invalid_market', 'Delivery country is not supported.');
  if (!Array.isArray(requested) || !requested.length || requested.length > ORDER_LIMITS.maxLines)
    throw new QuoteError('empty_cart', 'Check your basket.');
  const merged = new Map();
  for (const i of requested) {
    if (typeof i?.productId !== 'string' || !Number.isInteger(i.quantity) || i.quantity < 1)
      throw new QuoteError('invalid_item', 'Invalid basket item.');
    merged.set(i.productId, (merged.get(i.productId) || 0) + i.quantity);
  }
  const lines = [];
  for (const [id, quantity] of merged) {
    const p = resolveProduct(id);
    const unitPrice = priceFor(p, market);
    if (!p || p.published === false || unitPrice === null)
      throw new QuoteError('unavailable', 'An item is unavailable.', { productId: id });
    if (!p.available)
      throw new QuoteError('out_of_stock', 'An item is out of stock.', { productId: id });
    if (quantity > ORDER_LIMITS.maxQuantityPerLine)
      throw new QuoteError('quantity_limit', 'Too many of one item.');
    lines.push({
      productId: id,
      sku: p.sku,
      name: p.fullName,
      unitPrice,
      quantity,
      lineTotal: unitPrice * quantity,
    });
  }
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const shipping = shippingFor(subtotal, market, method);
  return {
    market,
    currency: 'EUR',
    lines,
    subtotal,
    shipping,
    total: subtotal + shipping,
    shippingMethod: method,
    freeShippingFrom: null,
    amountToFreeShipping: 0,
    meetsMinimum: true,
    minOrderValue: 0,
  };
}
export const paymentMethodsFor = (market) => (MARKETS[market] ? [PAYMENT_METHODS.stripe] : []);
