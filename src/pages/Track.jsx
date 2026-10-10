import { t } from '../lib/i18n';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Field from '../components/Field';
import OrderDetails from '../components/OrderDetails';
import Seo from '../components/Seo';
import { orderingMode } from '../config';
import { orderService } from '../services/orderService';
export function TrackForm({ initialNumber = '', onFound }) {
  const [orderNumber, setOrderNumber] = useState(initialNumber);
  const [phone, setPhone] = useState('');
  const [state, setState] = useState({
    busy: false,
    error: '',
  });
  const submit = async (event) => {
    event.preventDefault();
    if (!orderNumber.trim() || phone.replace(/\D/g, '').length < 6) {
      setState({
        busy: false,
        error: 'Enter your order number and the phone number you ordered with.',
      });
      return;
    }
    setState({
      busy: true,
      error: '',
    });
    try {
      onFound(await orderService.lookup(orderNumber.trim().toUpperCase(), phone));
      setState({
        busy: false,
        error: '',
      });
    } catch (error) {
      setState({
        busy: false,
        error: error.message,
      });
    }
  };
  return (
    <form className="track-form" onSubmit={submit} noValidate>
      <Field
        label={t('Order number')}
        name="orderNumber"
        value={orderNumber}
        onChange={(e) => setOrderNumber(e.target.value)}
        placeholder={t('EV-7K3M9Q2A')}
        autoCapitalize="characters"
        maxLength={11}
      />
      <Field
        label={t('Phone number')}
        name="phone"
        type="tel"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        autoComplete="tel"
        maxLength={20}
      />
      {state.error && (
        <p className="form-status" role="alert">
          {state.error}
        </p>
      )}
      <button
        className="btn btn--ink"
        type="submit"
        disabled={state.busy || orderingMode !== 'api'}
      >
        {state.busy ? 'Finding your order…' : 'Track order'}
      </button>
    </form>
  );
}
export default function Track() {
  const { orderNumber = '' } = useParams();
  const [order, setOrder] = useState(null);
  return (
    <main className="page container narrow">
      <Seo
        title={t('Track your order')}
        description={t('Check the status of your Earthveda order.')}
      />
      <header className="page-head">
        <p className="eyebrow">{t('Order status')}</p>
        <h1>{order ? `Order ${order.orderNumber}` : 'Track your order'}</h1>
        {!order && (
          <p>
            {t(
              'Use the order number from your confirmation and the phone number you ordered with.',
            )}
          </p>
        )}
      </header>
      {order ? (
        <>
          <OrderDetails order={order} />
          <button type="button" className="link" onClick={() => setOrder(null)}>
            {t('Track another order')}
          </button>
        </>
      ) : orderingMode === 'api' ? (
        <TrackForm initialNumber={orderNumber} onFound={setOrder} />
      ) : (
        <p className="notice">
          {t('Order tracking opens with online ordering. For now, message us on WhatsApp or see')}{' '}
          <Link to="/contact">{t('contact')}</Link>.
        </p>
      )}
    </main>
  );
}
