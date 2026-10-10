import { MARKETS, ORDER_LIMITS } from '../../shared/commerce.js';
import { priceFor } from '../../shared/catalog.js';
import { shippingFor } from '../../shared/pricing.js';

/** Pure cart logic · no React, so it is unit-testable in Node. */
const MAX = ORDER_LIMITS.maxQuantityPerLine;

export const isQuantityMap = (value) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.values(value).every((q) => Number.isInteger(q) && q > 0 && q <= MAX);

export function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const next = Math.min(MAX, (state[action.id] || 0) + action.amount);
      return { ...state, [action.id]: next };
    }
    case 'set': {
      const next = { ...state };
      if (!Number.isInteger(action.quantity) || action.quantity <= 0) delete next[action.id];
      else next[action.id] = Math.min(MAX, action.quantity);
      return next;
    }
    case 'bundle': {
      const next = { ...state };
      for (const p of action.products) next[p.id] = (next[p.id] || 0) + action.perFlavour;
      return next;
    }
    case 'clear':
      return {};
    default:
      return state;
  }
}

/**
 * Display-only basket summary. The server recomputes everything at order time;
 * this mirrors the same shared rules so the numbers match.
 */
export function summariseCart(quantities, market, resolve, shippingOptions) {
  const lines = Object.entries(quantities).map(([id, quantity]) => {
    const product = resolve(id);
    const unitPrice = priceFor(product, market);
    const issue = !product
      ? 'missing'
      : unitPrice === null
        ? 'not_sold'
        : !product.available
          ? 'out_of_stock'
          : null;
    return {
      id,
      product: product || {
        id,
        slug: '',
        name: id,
        fullName: id,
        category: '',
        range: '',
        accent: '#eeeeee',
        complianceReady: false,
      },
      quantity,
      unitPrice,
      lineTotal: issue ? 0 : unitPrice * quantity,
      issue,
    };
  });
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const settings = MARKETS[market];
  const shipping =
    subtotal === 0
      ? 0
      : (shippingOptions?.[market]?.find((s) => s.id === 'standard')?.fee ??
        shippingFor(subtotal, market));
  const hasIssues = lines.some((l) => l.issue);
  return {
    lines,
    count: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotal,
    shipping,
    total: subtotal + shipping,
    freeFrom: settings.shipping.freeFrom,
    toFreeShipping: 0,
    minOrderValue: settings.minOrderValue,
    meetsMinimum: subtotal >= settings.minOrderValue,
    hasIssues,
    canCheckout: lines.length > 0 && !hasIssues && subtotal >= settings.minOrderValue,
  };
}
