import { t } from '../lib/i18n';
import { Heart, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { priceFor } from '../../shared/catalog.js';
import { useCart } from '../context/CartContext';
import { useMarket } from '../context/MarketContext';
import { useWishlist } from '../context/WishlistContext';
import Price from './Price';
import ProductImage from './ProductImage';

/** Signature card: a vertical flavour band in the pack colour, like the pouches themselves. */
export default function ProductCard({ product, eager = false }) {
  const { add } = useCart();
  const { market } = useMarket();
  const wishlist = useWishlist();
  const wished = wishlist.has(product.id);
  const sellable = product.available && priceFor(product, market) !== null;
  const bandLabel = product.name.replace(' Plant Protein', '');
  return (
    <article
      className="card"
      style={{
        '--accent': product.accent,
      }}
    >
      <div className="card__band" aria-hidden="true">
        <span>{bandLabel}</span>
      </div>
      <div className="card__main">
        <Link
          to={`/product/${product.slug}`}
          className="card__media"
          tabIndex={-1}
          aria-hidden="true"
        >
          <ProductImage product={product} eager={eager} />
        </Link>
        {product.isNew && <span className="sticker">{t('New')}</span>}
        {!product.available && <span className="sticker sticker--muted">{t('Sold out')}</span>}
        <button
          type="button"
          className={`card__wish${wished ? ' is-on' : ''}`}
          onClick={() => wishlist.toggle(product.id)}
          aria-pressed={wished}
          aria-label={
            wished
              ? `Remove ${product.fullName} from wishlist`
              : `Save ${product.fullName} to wishlist`
          }
        >
          <Heart size={18} fill={wished ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
        <div className="card__body">
          <p className="card__meta">
            {product.isBundle
              ? product.sizeLabel
              : product.netWeightGrams
                ? `${t(product.category)} · ${product.netWeightGrams} g`
                : t(product.category)}
          </p>
          <h3 className="card__title">
            <Link to={`/product/${product.slug}`}>{product.name}</Link>
          </h3>
          <div className="card__foot">
            <Price product={product} />
            <button
              type="button"
              className="btn btn--add"
              onClick={() => add(product)}
              disabled={!sellable}
              aria-label={
                sellable ? `Add ${product.fullName} to bag` : `${product.fullName} is unavailable`
              }
            >
              <Plus size={16} aria-hidden="true" />
              {t('Add')}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
