import { t } from '../lib/i18n';
import { Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useMarket } from '../context/MarketContext';
import ProductImage from './ProductImage';
import QuantityControl from './QuantityControl';

const ISSUES = {
  missing: 'This product is no longer available. Remove it to continue.',
  not_sold: 'Not sold in this country · remove it or switch country.',
  out_of_stock: 'Sold out · remove it to continue.',
};

export default function CartLines({ compact = false }) {
  const { lines, setQuantity, remove } = useCart();
  const { money } = useMarket();
  return (
    <ul className={`lines${compact ? ' lines--compact' : ''}`}>
      {lines.map(({ id, product, quantity, lineTotal, issue }) => (
        <li key={id} className="line" style={{ '--accent': product.accent }}>
          <Link
            to={issue === 'missing' ? '/shop' : `/product/${product.slug}`}
            className="line__img"
            tabIndex={-1}
            aria-hidden="true"
          >
            {issue !== 'missing' && <ProductImage product={product} />}
          </Link>
          <div className="line__info">
            <Link
              to={issue === 'missing' ? '/shop' : `/product/${product.slug}`}
              className="line__name"
            >
              {product.name}
            </Link>
            <span className="line__meta">{t(product.category)}</span>
            {issue && (
              <span className="line__issue" role="status">
                {t(ISSUES[issue])}
              </span>
            )}
            <div className="line__controls">
              <QuantityControl
                value={quantity}
                onChange={(q) => setQuantity(id, q)}
                label={`${product.name} quantity`}
                size="sm"
              />
              <button
                type="button"
                className="icon-btn icon-btn--sm"
                onClick={() => remove(id)}
                aria-label={`Remove ${product.name}`}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
          <strong className="line__total">{issue ? '·' : money(lineTotal)}</strong>
        </li>
      ))}
    </ul>
  );
}
