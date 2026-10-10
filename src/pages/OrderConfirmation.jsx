import { useEffect, useState } from 'react';
import { useLocation, useParams, useSearchParams, Link } from 'react-router-dom';
import { apiRequest } from '../services/apiClient';
import OrderDetails from '../components/OrderDetails';
import { TrackForm } from './Track';
import { t } from '../lib/i18n';
import Seo from '../components/Seo';
export default function OrderConfirmation() {
  const { orderNumber } = useParams();
  const { state } = useLocation();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [order, setOrder] = useState(
    state?.order?.orderNumber === orderNumber ? state.order : null,
  );
  const [error, setError] = useState('');
  useEffect(() => {
    if (!token) return;
    const c = new AbortController();
    apiRequest('/orders/lookup', { method: 'POST', signal: c.signal, body: { orderNumber, token } })
      .then((r) => setOrder(r.order))
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [orderNumber, token]);
  return (
    <main className="page container narrow">
      <Seo title={t('Your order', 'Deine Bestellung')} noindex />
      <h1>
        {t('Order', 'Bestellung')} {orderNumber}
      </h1>
      <p role="alert">{error}</p>
      {order ? (
        <OrderDetails order={order} />
      ) : token && !error ? (
        <p>{t('Loading order…', 'Bestellung wird geladen…')}</p>
      ) : (
        <TrackForm initialNumber={orderNumber} onFound={setOrder} />
      )}
      <p>
        <Link to="/shop">{t('Keep shopping', 'Weiter einkaufen')}</Link>
      </p>
    </main>
  );
}
