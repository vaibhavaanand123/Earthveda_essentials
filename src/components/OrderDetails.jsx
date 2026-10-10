import { t } from '../lib/i18n';
import { formatMoney, PAYMENT_METHODS, STATUS_LABELS } from '../../shared/commerce.js';
const FLOW = ['pending_payment', 'confirmed', 'packed', 'shipped', 'delivered'];
const dateFmt = (iso, market) =>
  new Intl.DateTimeFormat(market === 'DE' ? 'de-DE' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));

/** Customer-facing order summary with a status timeline. */
export default function OrderDetails({ order }) {
  const money = (v) => formatMoney(v, order.market);
  const cancelled = order.status === 'cancelled';
  const reached = new Map(order.timeline?.map((t) => [t.status, t.at]) || []);
  const currentIndex = FLOW.indexOf(order.status);
  return (
    <div className="order">
      {order.trackingUrl && (
        <p>
          <a href={order.trackingUrl} rel="noreferrer" target="_blank">
            {t('Track parcel', 'Sendung verfolgen')} {order.trackingCode}
          </a>
        </p>
      )}
      {!cancelled ? (
        <ol className="timeline" aria-label={t('Order progress')}>
          {FLOW.map((s, i) => (
            <li
              key={s}
              className={i <= currentIndex ? 'is-done' : ''}
              aria-current={i === currentIndex ? 'step' : undefined}
            >
              <span className="timeline__dot" aria-hidden="true" />
              <strong>{t(STATUS_LABELS[s])}</strong>
              {reached.get(s) && <small>{dateFmt(reached.get(s), order.market)}</small>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="notice">
          {t('This order was cancelled. If you didn\u2019t expect this, contact us.')}
        </p>
      )}
      <table className="order__table">
        <caption className="sr-only">
          {t('Items in order')}
          {order.orderNumber}
        </caption>
        <tbody>
          {order.lines.map((l) => (
            <tr key={l.productId}>
              <td>
                {l.quantity} × {l.name}
              </td>
              <td>{money(l.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">{t('Delivery')}</th>
            <td>{order.shipping === 0 ? 'Free' : money(order.shipping)}</td>
          </tr>
          <tr className="order__total">
            <th scope="row">{t('Total')}</th>
            <td>{money(order.total)}</td>
          </tr>
          <tr>
            <th scope="row">{t('Payment')}</th>
            <td>{t(STATUS_LABELS[order.status])}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
