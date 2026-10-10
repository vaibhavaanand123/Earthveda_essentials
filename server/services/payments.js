import Stripe from 'stripe';
import { AppError } from '../lib/errors.js';
export function createPayments(config) {
  const stripe = config.STRIPE_SECRET_KEY
    ? new Stripe(config.STRIPE_SECRET_KEY, { timeout: 12000, maxNetworkRetries: 2 })
    : null;
  const requireStripe = () => {
    if (!stripe)
      throw new AppError(
        503,
        'payments_unavailable',
        'Payments are being set up. Please check back soon.',
      );
    return stripe;
  };
  return {
    async createSession(order) {
      return requireStripe().checkout.sessions.create(
        {
          mode: 'payment',
          client_reference_id: order.id,
          customer_email: order.customer.email,
          locale: order.language === 'de' ? 'de' : 'en',
          success_url: `${config.publicSiteUrl}/payment-return?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${config.publicSiteUrl}/checkout?cancelled=1`,
          expires_at: Math.floor(new Date(order.createdAt).getTime() / 1000) + 3600,
          metadata: { order_id: order.id, order_number: order.orderNumber },
          payment_intent_data: {
            metadata: { order_id: order.id, order_number: order.orderNumber },
          },
          line_items: [
            ...order.lines.map((l) => ({
              quantity: l.quantity,
              price_data: {
                currency: 'eur',
                unit_amount: l.unitPrice,
                product_data: { name: l.name },
              },
            })),
            {
              quantity: 1,
              price_data: {
                currency: 'eur',
                unit_amount: order.shipping,
                product_data: { name: order.language === 'de' ? 'Versand' : 'Shipping' },
              },
            },
          ],
        },
        { idempotencyKey: `checkout-${order.id}` },
      );
    },
    async findSession(order) {
      let scanned = 0;
      const first = Math.floor(new Date(order.createdAt).getTime() / 1000);
      for await (const session of requireStripe().checkout.sessions.list({
        created: { gte: first - 60, lte: first + 3600 },
        limit: 100,
      })) {
        if (session.client_reference_id === order.id) return session;
        if (++scanned > 10000)
          throw new Error('Payment recovery scan limit reached; manual review required.');
      }
      return null;
    },
    retrieveSession: (id) => requireStripe().checkout.sessions.retrieve(id),
    expireSession: (id) => requireStripe().checkout.sessions.expire(id),
    verifyWebhook: (body, signature) =>
      requireStripe().webhooks.constructEvent(body, signature, config.STRIPE_WEBHOOK_SECRET),
    refund: (order) =>
      requireStripe().refunds.create(
        { payment_intent: order.paymentIntent, reason: 'requested_by_customer' },
        { idempotencyKey: `refund-${order.id}` },
      ),
    retrieveRefund: (id) => requireStripe().refunds.retrieve(id),
  };
}
