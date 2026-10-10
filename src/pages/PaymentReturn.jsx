import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../services/apiClient';
import { useCart } from '../context/CartContext';
import OrderDetails from '../components/OrderDetails';
import { t } from '../lib/i18n';
import Seo from '../components/Seo';
export default function PaymentReturn() {
  const [params] = useSearchParams();
  const session = params.get('session_id');
  const { clear } = useCart();
  const [order, setOrder] = useState(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    let timer;
    let attempts = 0;
    const controller = new AbortController();
    async function poll() {
      try {
        const r = await apiRequest(
          '/checkout/status?session_id=' + encodeURIComponent(session || ''),
          { signal: controller.signal },
        );
        if (!active) return;
        setOrder(r.order);
        if (r.order.paymentStatus === 'paid') {
          clear();
          try {
            sessionStorage.removeItem('earthveda-checkout-attempt');
          } catch {}
        } else if (r.order.status === 'pending_payment' && attempts++ < 12)
          timer = setTimeout(poll, 2500);
      } catch (e) {
        if (active) setMessage(e.message);
      }
    }
    poll();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [session, clear]);
  return (
    <main className="page container narrow">
      <Seo title={t('Your payment', 'Deine Zahlung')} noindex />
      <div className="confirm">
        <p className="eyebrow">
          {order?.paymentStatus === 'paid'
            ? t('Payment confirmed', 'Zahlung bestätigt')
            : t('Checking payment', 'Zahlung wird geprüft')}
        </p>
        <h1>
          {order?.paymentStatus === 'paid'
            ? t('Thank you for your order.', 'Vielen Dank für deine Bestellung.')
            : t('We are checking your payment.', 'Wir prüfen deine Zahlung.')}
        </h1>
        <p role="status">
          {message ||
            (!order
              ? t('Please keep this page open.', 'Bitte lasse diese Seite geöffnet.')
              : order.paymentStatus !== 'paid'
                ? t(
                    'Your order is awaiting payment verification. We will email you when it is confirmed.',
                    'Deine Bestellung wartet auf die Zahlungsbestätigung. Wir senden dir anschließend eine E-Mail.',
                  )
                : '')}
        </p>
        {order && (
          <>
            <p>{order.orderNumber}</p>
            <OrderDetails order={order} />
          </>
        )}
        <Link to="/track">{t('Track an order', 'Bestellung verfolgen')}</Link> ·{' '}
        <Link to="/shop">{t('Keep shopping', 'Weiter einkaufen')}</Link>
      </div>
    </main>
  );
}
