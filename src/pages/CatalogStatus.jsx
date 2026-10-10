import { t } from '../lib/i18n';
import { useCatalog } from '../context/CatalogContext';

/** Shared loading / error state for pages that need the catalogue. */
export default function CatalogStatus() {
  const { loading, error, retry } = useCatalog();
  if (loading)
    return (
      <main className="page container" aria-busy="true" aria-label={t('Loading products')}>
        <div className="skeleton skeleton--hero" />
        <div className="product-grid">
          {Array.from(
            {
              length: 4,
            },
            (_, i) => (
              <div className="skeleton skeleton--card" key={i} />
            ),
          )}
        </div>
      </main>
    );
  return (
    <main className="page container empty">
      <h1>{error ? 'We couldn’t load the shop' : 'No products yet'}</h1>
      <p>{error ? 'Check your connection, then try again.' : 'Please check back soon.'}</p>
      {error && (
        <button type="button" className="btn btn--ink" onClick={retry}>
          {t('Try again')}
        </button>
      )}
    </main>
  );
}
