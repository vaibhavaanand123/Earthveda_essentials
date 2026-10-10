import { t } from '../lib/i18n';
import { ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useMarket } from '../context/MarketContext';
import { useCloseOnNavigate } from '../hooks/useCloseOnNavigate';
import { useDialog } from '../hooks/useDialog';
import CartLines from './CartLines';
import FreeShippingMeter from './FreeShippingMeter';
export default function CartDrawer() {
  const cart = useCart();
  const { money } = useMarket();
  const ref = useDialog(cart.drawerOpen, cart.closeDrawer);
  useCloseOnNavigate(cart.closeDrawer);
  if (!cart.drawerOpen) return null;
  return (
    <div className="overlay" onClick={cart.closeDrawer} role="presentation">
      <aside
        ref={ref}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="drawer__head">
          <h2 id="drawer-title">
            {t('Your bag')}
            <span>({cart.count})</span>
          </h2>
          <button
            type="button"
            className="icon-btn"
            onClick={cart.closeDrawer}
            aria-label={t('Close bag')}
            data-autofocus
          >
            <X aria-hidden="true" />
          </button>
        </header>
        {cart.lines.length === 0 ? (
          <div className="drawer__empty">
            <p>{t('Your bag is empty.')}</p>
            <Link className="btn btn--ink" to="/shop?range=makhana">
              {t('Shop roasted makhana')}
            </Link>
          </div>
        ) : (
          <>
            <FreeShippingMeter />
            <div className="drawer__lines">
              <CartLines compact />
            </div>
            <footer className="drawer__foot">
              <div className="drawer__row">
                <span>{t('Subtotal')}</span>
                <strong>{money(cart.subtotal)}</strong>
              </div>
              {!cart.meetsMinimum ? (
                <p className="drawer__note" role="status">
                  {t('Minimum order is')}
                  {money(cart.minOrderValue)}.
                </p>
              ) : (
                <p className="drawer__note">{t('Delivery is calculated at checkout.')}</p>
              )}
              {cart.canCheckout ? (
                <Link className="btn btn--ink btn--block" to="/checkout">
                  {t('Checkout')}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              ) : (
                <button type="button" className="btn btn--ink btn--block" disabled>
                  {t('Checkout')}
                </button>
              )}
              <Link className="link" to="/cart">
                {t('View full bag')}
              </Link>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
