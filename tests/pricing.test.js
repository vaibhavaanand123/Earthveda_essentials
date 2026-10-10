import assert from 'node:assert/strict';
import { test } from 'node:test';
import { quoteOrder, shippingFor } from '../shared/pricing.js';
import { products } from '../shared/catalog.js';
import { cartReducer } from '../src/lib/cart.js';
const resolve = (id) => products.find((p) => p.id === id);
test('8 and 16 packs price exactly in euro cents, with paid shipping', () => {
  const items = products.slice(0, 4).map((p) => ({ productId: p.id, quantity: 2 }));
  const a = quoteOrder(items, 'DE', resolve);
  assert.equal(a.subtotal, 2392);
  assert.equal(a.shipping, 499);
  assert.equal(a.total, 2891);
  const b = quoteOrder(
    items.map((i) => ({ ...i, quantity: 4 })),
    'GB',
    resolve,
    'express',
  );
  assert.equal(b.subtotal, 4784);
  assert.equal(b.shipping, 1199);
  assert.equal(b.total, 5983);
});
test('duplicate lines merge before limits; unknown markets and negative quantities fail', () => {
  assert.throws(
    () =>
      quoteOrder(
        [
          { productId: 'peri-peri', quantity: 30 },
          { productId: 'peri-peri', quantity: 30 },
        ],
        'DE',
        resolve,
      ),
    /Too many/,
  );
  assert.throws(() => quoteOrder([{ productId: 'peri-peri', quantity: -1 }], 'DE', resolve));
  assert.throws(() => quoteOrder([{ productId: 'peri-peri', quantity: 1 }], 'IN', resolve));
  assert.equal(shippingFor(100000, 'DE'), 499);
});
test('bundle insertion preserves existing cart items in one state transition', () => {
  const next = cartReducer(
    { 'cream-onion': 1 },
    { type: 'bundle', products: products.slice(0, 4), perFlavour: 2 },
  );
  assert.equal(next['cream-onion'], 3);
  assert.equal(
    Object.values(next).reduce((a, b) => a + b),
    9,
  );
});
test('an archived or missing basket item is retained as a visible checkout blocker', async () => {
  const { summariseCart } = await import('../src/lib/cart.js');
  const c = summariseCart({ 'removed-product': 2 }, 'DE', () => null);
  assert.equal(c.lines.length, 1);
  assert.equal(c.lines[0].issue, 'missing');
  assert.equal(c.canCheckout, false);
});
