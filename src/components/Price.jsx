import { t } from '../lib/i18n';
import { priceFor, unitPricePerKg } from '../../shared/catalog.js';
import { useMarket } from '../context/MarketContext';

/** Price with compare-at and, where the weight is known, the price per kg (required in Germany). */
export default function Price({ product, quantity = 1, showUnit = true, className = '' }) {
  const { market, money } = useMarket();
  const price = priceFor(product, market);
  if (price === null)
    return <span className={`price price--na ${className}`}>{t('Not sold in this country')}</span>;
  const compareAt = product.compareAt?.[market];
  const perKg = showUnit ? unitPricePerKg(product, market) : null;
  return (
    <span className={`price ${className}`}>
      <strong>{money(price * quantity)}</strong>
      {compareAt > price && (
        <s aria-label={`Regular price ${money(compareAt * quantity)}`}>
          {money(compareAt * quantity)}
        </s>
      )}
      {perKg !== null && (
        <small className="price__unit">
          {money(perKg)}
          {t('/ kg')}
        </small>
      )}
    </span>
  );
}
