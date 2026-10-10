import FoodInformation from '../components/FoodInformation';
import { t } from '../lib/i18n';
import { Check, Heart, ShoppingBag, Truck } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MOMENTS, priceFor } from '../../shared/catalog.js';
import { PAYMENT_METHODS } from '../../shared/commerce.js';
import EmptyState from '../components/EmptyState';
import Price from '../components/Price';
import ProductGrid from '../components/ProductGrid';
import ProductImage from '../components/ProductImage';
import QuantityControl from '../components/QuantityControl';
import Seo from '../components/Seo';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { useMarket } from '../context/MarketContext';
import { useWishlist } from '../context/WishlistContext';
import CatalogStatus from './CatalogStatus';
export default function Product() {
  const { slug } = useParams();
  const { catalog, loading, error, findBySlug } = useCatalog();
  const { market, settings } = useMarket();
  const { add } = useCart();
  const wishlist = useWishlist();
  // The route remounts per pathname (see App), so quantity resets per product.
  const [quantity, setQuantity] = useState(1);
  if (loading || error) return <CatalogStatus />;
  const product = findBySlug(slug);
  if (!product)
    return (
      <main className="page container">
        <Seo
          title={t('Product not found')}
          description={t('This product could not be found.')}
          noindex
        />
        <EmptyState
          title={t('We can\u2019t find that snack')}
          description={t('It may have been renamed. Have a look at the full range.')}
        />
      </main>
    );
  const sellable = product.available && priceFor(product, market) !== null;
  const wished = wishlist.has(product.id);
  const related = catalog
    .filter((p) => p.id !== product.id && p.range === product.range)
    .slice(0, 4);
  const methods = settings.paymentMethods.map((id) => PAYMENT_METHODS[id].label).join(' or ');
  const addToCart = () => add(product, quantity);
  return (
    <main
      className="page container"
      style={{
        '--accent': product.accent,
      }}
    >
      <Seo
        title={product.fullName}
        description={t(product.description, product.descriptionDe || product.description)}
        product={product}
        market={market}
      />
      <nav className="crumbs" aria-label={t('Breadcrumb')}>
        <Link to="/">{t('Home')}</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/shop?range=${product.range}`}>{t(product.category)}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="pdp">
        <div className="pdp__media">
          <div className="pdp__band" aria-hidden="true">
            <span>{product.name.replace(' Plant Protein', '')}</span>
          </div>
          <div className="pdp__img">
            <ProductImage product={product} eager />
          </div>
        </div>

        <div className="pdp__info">
          <p className="eyebrow">
            {t(product.category)}
            {product.isNew && <span className="sticker sticker--inline">{t('New')}</span>}
          </p>
          <h1>{product.name}</h1>
          <p className="pdp__size">{product.sizeLabel}</p>
          <Price product={product} showUnit className="price--lg" />
          <p className="pdp__tax">
            {t('Includes taxes, plus shipping', 'Inklusive Steuern, zuzüglich Versand')}
          </p>

          <p className="pdp__desc">
            {t(product.description, product.descriptionDe || product.description)}
          </p>

          {product.highlights?.length > 0 && (
            <ul className="pdp__highlights">
              {product.highlights.map((h) => (
                <li key={h}>
                  <Check size={16} aria-hidden="true" /> {h}
                </li>
              ))}
            </ul>
          )}

          {!product.available && (
            <p className="notice">
              {t('Sold out for now. Save it to your wishlist and check back soon.')}
            </p>
          )}
          {product.available && priceFor(product, market) === null && (
            <p className="notice">
              {t('Not sold in')}
              {settings.name}
              {t('yet. Switch country at the top of the page.')}
            </p>
          )}

          <div className="pdp__buy">
            {sellable && (
              <QuantityControl
                value={quantity}
                onChange={setQuantity}
                label={`${product.name} quantity`}
              />
            )}
            <button
              type="button"
              className="btn btn--ink btn--grow"
              onClick={addToCart}
              disabled={!sellable}
            >
              <ShoppingBag size={18} aria-hidden="true" />
              {t('Add to bag')}
              {sellable && (
                <>
                  {' · '}
                  <Price product={product} quantity={quantity} />
                </>
              )}
            </button>
            <button
              type="button"
              className={`icon-btn icon-btn--outline${wished ? ' is-on' : ''}`}
              onClick={() => wishlist.toggle(product.id)}
              aria-pressed={wished}
              aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
            >
              <Heart fill={wished ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          </div>

          <div className="pdp__promise">
            <Truck size={18} aria-hidden="true" />
            <p>
              {t(settings.deliveryPromise, 'Lieferzeiten werden an der Kasse bestätigt')}.{' '}
              <strong>{methods}</strong>
              {t('at checkout.')}
            </p>
          </div>

          {product.moments?.length > 0 && (
            <p className="pdp__moments">
              {t('Good for:')}{' '}
              {product.moments.map((m, i) => (
                <span key={m}>
                  {i > 0 && ', '}
                  <Link to={`/shop?moment=${m}`}>{t(MOMENTS[m]?.label || m).toLowerCase()}</Link>
                </span>
              ))}
            </p>
          )}

          <div className="accordion">
            <details open>
              <summary>{t('How to enjoy')}</summary>
              <p>{product.howToEnjoy}</p>
            </details>
            <details>
              <summary>{t('Ingredients, allergens & nutrition')}</summary>
              <FoodInformation product={product} />
            </details>
            <details>
              <summary>{t('Delivery & returns')}</summary>
              <p>
                {t(settings.deliveryPromise, 'Lieferzeiten werden an der Kasse bestätigt')}
                {t('. Read our')}
                <Link to="/shipping">{t('delivery')}</Link>
                {t('and')} <Link to="/returns">{t('returns')}</Link>
                {t('pages.')}
              </p>
            </details>
          </div>
        </div>
      </div>

      {sellable && (
        <div className="sticky-buy only-mobile" role="region" aria-label={t('Quick add')}>
          <div>
            <strong>{product.name}</strong>
            <Price product={product} />
          </div>
          <button type="button" className="btn btn--ink" onClick={addToCart}>
            {t('Add to bag')}
          </button>
        </div>
      )}

      {related.length > 0 && (
        <section className="section" aria-labelledby="related-title">
          <div className="section-head">
            <div>
              <p className="eyebrow">{t('Keep exploring')}</p>
              <h2 id="related-title">
                {t('More from')}
                {product.category.toLowerCase()}
              </h2>
            </div>
          </div>
          <ProductGrid products={related} label={t('Related products')} />
        </section>
      )}
    </main>
  );
}
