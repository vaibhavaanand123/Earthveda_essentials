import { t } from '../lib/i18n';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import CartLines from '../components/CartLines';
import EmptyState from '../components/EmptyState';
import FreeShippingMeter from '../components/FreeShippingMeter';
import Seo from '../components/Seo';
import { useCart } from '../context/CartContext';
import { useMarket } from '../context/MarketContext';
import CatalogStatus from './CatalogStatus';
export function OrderTotals({ cart }) {
  const { money } = useMarket();
  return (
    <dl className="totals">
      <div>
        <dt>{t('Subtotal')}</dt>
        <dd>{money(cart.subtotal)}</dd>
      </div>
      <div>
        <dt>{t('Delivery')}</dt>
        <dd>{cart.shipping === 0 ? 'Free' : money(cart.shipping)}</dd>
      </div>
      <div className="totals__grand">
        <dt>{t('Total')}</dt>
        <dd>{money(cart.total)}</dd>
      </div>
    </dl>
  );
}
export default function Cart() {
  const cart = useCart();
  const { money, settings } = useMarket();
  if (!cart.ready) return <CatalogStatus />;
  return (
    <main className="page container">
      <Seo title={t('Your bag')} description={t('Review the snacks in your bag.')} noindex />
      <header className="page-head">
        <p className="eyebrow">{t('Your bag')}</p>
        <h1>
          {cart.count
            ? t(`${cart.count} snacks in your bag`, `${cart.count} Snacks in deinem Warenkorb`)
            : 'Your bag'}
        </h1>
      </header>
      {!cart.lines.length ? (
        <EmptyState
          title={t('Your bag is empty')}
          description={t(
            'Start with roasted makhana \xB7 seven flavours, all roasted, none fried.',
          )}
          to="/shop?range=makhana"
          action="Shop makhana"
        />
      ) : (
        <div className="split">
          <section aria-label={t('Items')}>
            <CartLines />
          </section>
          <aside className="summary" aria-label={t('Order summary')}>
            <h2>{t('Summary')}</h2>
            <FreeShippingMeter />
            <OrderTotals cart={cart} />
            <p className="summary__note">
              {t('Prices include VAT. Delivering to')}
              {settings.name}.
            </p>
            {cart.hasIssues && (
              <p className="notice" role="status">
                {t('Remove the items marked above to continue.')}
              </p>
            )}
            {!cart.meetsMinimum && (
              <p className="notice" role="status">
                {t('The minimum order is')}
                {money(cart.minOrderValue)}.
              </p>
            )}
            {cart.canCheckout ? (
              <Link className="btn btn--ink btn--block" to="/checkout">
                {t('Checkout')}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            ) : (
              <button className="btn btn--ink btn--block" type="button" disabled>
                {t('Checkout')}
              </button>
            )}
            <Link className="link" to="/shop">
              {t('Keep shopping')}
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}
