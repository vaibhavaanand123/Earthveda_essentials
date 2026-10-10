import crypto from 'node:crypto';
import { quoteOrder, QuoteError } from '../../shared/pricing.js';
import { STATUS_TRANSITIONS } from '../../shared/commerce.js';
import { AppError, conflict, notFound, badRequest } from '../lib/errors.js';
import { hash } from '../db/store.js';
const now = () => new Date().toISOString();
const publicOrder = (o) => ({
  orderNumber: o.orderNumber,
  market: o.market,
  currency: o.currency,
  status: o.status,
  paymentStatus: o.paymentStatus,
  subtotal: o.subtotal,
  shipping: o.shipping,
  total: o.total,
  lines: o.lines,
  customer: { firstName: o.customer.firstName, city: o.customer.city },
  createdAt: o.createdAt,
  timeline: o.timeline,
  trackingCode: o.trackingCode,
  trackingUrl: o.trackingUrl,
});
const digits = (phone, market) => {
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = (market === 'DE' ? '49' : '44') + d.slice(1);
  return d;
};
export function createCommerceService(store, payments, config) {
  const queue = (o, label) => {
    const token = o.accessToken;
    store.enqueue(`${o.id}-${label}-customer`, 'order-email', {
      to: o.customer.email,
      order: o,
      token,
    });
    if (config.TEAM_EMAIL)
      store.enqueue(`${o.id}-${label}-team`, 'order-email', {
        to: config.TEAM_EMAIL,
        order: o,
        token,
      });
    if (o.whatsappOptIn)
      store.enqueue(`${o.id}-${label}-wa`, 'whatsapp', {
        to: digits(o.customer.phone, o.market),
        order: o,
      });
    if (config.TEAM_WHATSAPP && config.TEAM_WHATSAPP_OPT_IN)
      store.enqueue(`${o.id}-${label}-team-wa`, 'whatsapp', { to: config.TEAM_WHATSAPP, order: o });
  };
  let reconciling = false;
  const release = (o) => o.lines.forEach((line) => store.releaseStock(line));
  const service = {
    async checkout(input, key) {
      const fp = hash(JSON.stringify(input));
      if (input.whatsappOptIn && (!config.WHATSAPP_ACCESS_TOKEN || !config.WHATSAPP_PHONE_ID))
        throw badRequest(
          'whatsapp_unavailable',
          'WhatsApp updates are not connected yet. Please use email updates.',
        );
      let order = store.byKey(key);
      if (order && order.fingerprint !== fp)
        throw conflict(
          'idempotency_conflict',
          'This checkout request has changed. Start a new attempt.',
        );
      if (!order) {
        const settings = store.settings();
        if (!config.CHECKOUT_ENABLED || !settings.legalApproved || !settings.shippingApproved)
          throw new AppError(503, 'launch_pending', 'Online checkout opens soon.');
        if (input.market === 'GB' && !settings.ukApproved)
          throw new AppError(503, 'uk_pending', 'UK delivery is being set up.');
        let quote;
        try {
          quote = quoteOrder(
            input.items,
            input.market,
            (id) => store.product(id),
            input.shippingMethod,
          );
        } catch (e) {
          if (e instanceof QuoteError) throw badRequest(e.code, e.message, e.details);
          throw e;
        }
        const shipping = settings.shipping[input.market].find((s) => s.id === input.shippingMethod);
        if (!shipping) throw badRequest('shipping', 'Delivery service unavailable');
        quote.shipping = shipping.fee;
        quote.total = quote.subtotal + shipping.fee;
        // No assumed VAT percentage: a verified per-market rate is required for each product.
        for (const l of quote.lines) {
          const p = store.product(l.productId);
          if (!p.complianceReady)
            throw conflict('product_setup_pending', 'A product is not ready for sale.');
          l.netWeightGrams = p.netWeightGrams;
          l.ingredients = p.ingredients[input.language];
          l.allergens = p.allergens[input.language];
          l.taxRate = p.taxRates[input.market];
          l.taxIncluded = Math.round(l.lineTotal - l.lineTotal / (1 + l.taxRate / 100));
        }
        const id = crypto.randomUUID();
        order = {
          ...quote,
          id,
          orderNumber: 'EV-' + crypto.randomBytes(6).toString('hex').toUpperCase(),
          fingerprint: fp,
          customer: input.customer,
          language: input.language,
          note: input.note,
          whatsappOptIn: input.whatsappOptIn,
          status: 'pending_payment',
          paymentStatus: 'unpaid',
          paymentMethod: 'stripe',
          createdAt: now(),
          timeline: [{ status: 'pending_payment', at: now() }],
          accessToken: crypto.randomBytes(32).toString('base64url'),
          policyVersion: settings.policyVersion,
          policySnapshot: {
            terms: settings.policies[input.language].terms,
            withdrawal: settings.policies[input.language].withdrawal,
          },
          shippingLabel: shipping.label,
        };
        store.tx(() => {
          order.lines.forEach((line) => store.reserveStock(line));
          store.insertOrder(order, key, fp);
          store.audit('customer', 'checkout.created', order.orderNumber);
        });
      }
      if (order.paymentStatus === 'paid') return { order: publicOrder(order), paid: true };
      if (order.status !== 'pending_payment')
        throw conflict('checkout_expired', 'This checkout has expired. Start a new checkout.');
      if (order.sessionId) {
        const session = await payments.retrieveSession(order.sessionId);
        const updated = this.applySession(session);
        if (updated?.paymentStatus === 'paid') return { order: publicOrder(updated), paid: true };
        if (session.status !== 'open')
          throw conflict('checkout_finished', 'This checkout is no longer open. Check your order.');
        return { order: publicOrder(order), checkoutUrl: session.url };
      }
      // The provider idempotency key is stable. Ambiguous failures retain the reservation for reconciliation.
      const session = await payments.createSession(order);
      store.tx(() => {
        const latest = store.byId(order.id);
        if (latest.sessionId && latest.sessionId !== session.id)
          throw conflict('payment_session', 'Checkout session mismatch');
        latest.sessionId = session.id;
        store.updateOrder(latest);
      });
      return { order: publicOrder(order), checkoutUrl: session.url };
    },
    applySession(session) {
      let order = store.byId(session.metadata?.order_id || session.client_reference_id);
      if (!order) return;
      const paid = session.payment_status === 'paid';
      if (
        session.livemode !== config.STRIPE_LIVE_MODE ||
        session.amount_total !== order.total ||
        session.currency?.toLowerCase() !== 'eur' ||
        session.client_reference_id !== order.id ||
        (order.sessionId && session.id !== order.sessionId)
      )
        throw conflict('payment_mismatch', 'Payment verification failed.');
      if (
        paid &&
        ![
          'pending_payment',
          'confirmed',
          'packed',
          'shipped',
          'delivered',
          'refund_pending',
          'refunded',
        ].includes(order.status)
      )
        throw conflict(
          'payment_after_expiry',
          'Payment needs manual reconciliation. Please contact the shop.',
        );
      store.tx(() => {
        order = store.byId(order.id);
        if (!order.sessionId) order.sessionId = session.id;
        if (paid && order.paymentStatus !== 'paid' && order.status === 'pending_payment') {
          order.lines.forEach((line) => store.sellStock(line));
          order.paymentStatus = 'paid';
          order.paymentIntent =
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id;
          order.status = 'confirmed';
          order.timeline.push({ status: 'confirmed', at: now() });
          store.updateOrder(order);
          queue(order, 'paid');
          store.audit('stripe', 'payment.verified', order.orderNumber);
        } else if (!paid && session.status === 'expired' && order.status === 'pending_payment') {
          release(order);
          order.status = 'expired';
          order.timeline.push({ status: 'expired', at: now() });
          store.updateOrder(order);
        } else store.updateOrder(order);
      });
      return store.byId(order.id);
    },
    async webhook(event) {
      if (event.livemode !== config.STRIPE_LIVE_MODE)
        throw badRequest('wrong_mode', 'Payment mode mismatch.');
      if (store.paymentEventSeen(event.id)) return;
      const sessionTypes = [
        'checkout.session.completed',
        'checkout.session.async_payment_succeeded',
        'checkout.session.async_payment_failed',
        'checkout.session.expired',
      ];
      if (sessionTypes.includes(event.type)) {
        // Retrieve authoritative session. This also validates amount, currency and ownership.
        const session = await payments.retrieveSession(event.data.object.id);
        this.applySession(session);
        if (
          event.type === 'checkout.session.async_payment_failed' &&
          session.payment_status !== 'paid'
        ) {
          store.tx(() => {
            const o = store.byId(session.metadata?.order_id || session.client_reference_id);
            if (o?.status === 'pending_payment') {
              release(o);
              o.status = 'expired';
              o.timeline.push({ status: 'expired', at: now() });
              store.updateOrder(o);
            }
          });
        }
      }
      if (event.type === 'refund.updated' || event.type === 'refund.failed') {
        const refund = event.data.object;
        const order = store.orderByRefund(refund.id);
        if (order) this.applyRefund(order, refund);
      }
      store.recordPaymentEvent(event.id);
    },
    async status(sessionId) {
      const s = await payments.retrieveSession(sessionId);
      const o = this.applySession(s);
      if (!o) throw notFound();
      return publicOrder(o);
    },
    lookup({ orderNumber, phone, token }) {
      const o = store.order(orderNumber);
      const valid =
        o &&
        (token
          ? hash(token) === hash(o.accessToken)
          : phone && digits(phone, o.market) === digits(o.customer.phone, o.market));
      if (!valid) throw notFound('Order not found. Check your order number and details.');
      return publicOrder(o);
    },
    updateStatus(number, input, actor) {
      return store.tx(() => {
        const o = store.order(number);
        if (!o) throw notFound();
        if (o.status === input.status) return o;
        if (
          !STATUS_TRANSITIONS[o.status]?.includes(input.status) ||
          input.status === 'refund_pending'
        )
          throw conflict('invalid_transition', 'This order cannot move to that status.');
        if (o.paymentStatus !== 'paid')
          throw conflict('unpaid', 'Only verified paid orders can be fulfilled.');
        if (input.status === 'shipped' && (!input.trackingCode || !input.trackingUrl))
          throw badRequest('tracking_required', 'Add parcel tracking before shipping.');
        o.status = input.status;
        o.trackingCode = input.trackingCode || o.trackingCode || '';
        o.trackingUrl = input.trackingUrl || o.trackingUrl || '';
        o.timeline.push({ status: o.status, at: now() });
        store.updateOrder(o);
        store.audit(actor, 'order.' + o.status, number);
        queue(o, o.status);
        return o;
      });
    },
    async refund(number, actor) {
      let o = store.order(number);
      if (!o) throw notFound();
      if (o.status === 'refunded') return o;
      if (o.paymentStatus !== 'paid' || !o.paymentIntent)
        throw conflict('unpaid', 'No refundable payment.');
      if (!['confirmed', 'packed', 'shipped', 'delivered', 'refund_pending'].includes(o.status))
        throw conflict('refund_invalid', 'Order cannot be refunded.');
      store.tx(() => {
        o = store.order(number);
        o.status = 'refund_pending';
        store.updateOrder(o);
        store.audit(actor, 'refund.requested', number);
      });
      const r = await payments.refund(o);
      this.applyRefund(o, r);
      return store.order(number);
    },
    applyRefund(original, r) {
      const intent = typeof r.payment_intent === 'string' ? r.payment_intent : r.payment_intent?.id;
      if (r.amount !== original.total || r.currency !== 'eur' || intent !== original.paymentIntent)
        throw conflict(
          'refund_mismatch',
          'Refund verification failed. Check the payment provider.',
        );
      store.tx(() => {
        const o = store.byId(original.id);
        o.refundId = r.id;
        o.refundProviderStatus = r.status;
        if (r.status === 'succeeded' && o.status !== 'refunded') {
          o.status = 'refunded';
          o.paymentStatus = 'refunded';
          o.timeline.push({ status: 'refunded', at: now() });
          queue(o, 'refunded');
        }
        store.updateOrder(o);
      });
    },
    async reconcile() {
      if (reconciling) return { busy: true };
      reconciling = true;
      const failures = [];
      const started = Date.now();
      let checked = 0;
      try {
        const rows = store.pendingOrders(50);
        for (const o of rows) {
          if (Date.now() - started > 20000) break;
          checked++;
          try {
            if (o.status === 'refund_pending') {
              if (o.refundId) this.applyRefund(o, await payments.retrieveRefund(o.refundId));
              else await this.refund(o.orderNumber, 'reconciler');
              continue;
            }
            if (o.sessionId) {
              this.applySession(await payments.retrieveSession(o.sessionId));
              continue;
            }
            const age = Date.now() - new Date(o.createdAt).getTime();
            if (age < 1800000) {
              const s = await payments.createSession(o);
              store.tx(() => {
                const latest = store.byId(o.id);
                latest.sessionId = s.id;
                store.updateOrder(latest);
              });
              this.applySession(s);
            } else if (payments.findSession) {
              const found = await payments.findSession(o);
              if (found) this.applySession(found);
              else if (age > 3900000) {
                store.tx(() => {
                  const latest = store.byId(o.id);
                  if (latest.status === 'pending_payment' && !latest.sessionId) {
                    release(latest);
                    latest.status = 'expired';
                    latest.timeline.push({ status: 'expired', at: now() });
                    store.updateOrder(latest);
                  }
                });
              }
            }
          } catch {
            failures.push({
              orderNumber: o.orderNumber,
              error: 'Provider reconciliation failed. Check payment provider and retry.',
            });
          } finally {
            store.touchOrder(o.id);
          }
        }
        return { checked, failures };
      } finally {
        reconciling = false;
      }
    },
    queue,
    publicOrder,
  };
  return service;
}
