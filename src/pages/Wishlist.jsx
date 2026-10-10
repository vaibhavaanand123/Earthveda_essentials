import { t } from '../lib/i18n';
import EmptyState from '../components/EmptyState';
import ProductGrid from '../components/ProductGrid';
import Seo from '../components/Seo';
import { useCatalog } from '../context/CatalogContext';
import { useWishlist } from '../context/WishlistContext';
export default function Wishlist() {
  const { ids } = useWishlist();
  const { catalog } = useCatalog();
  const saved = catalog.filter((p) => ids.includes(p.id));
  return (
    <main className="page container">
      <Seo title={t('Wishlist')} description={t('Snacks you saved for later.')} noindex />
      <header className="page-head">
        <p className="eyebrow">{t('Saved for later')}</p>
        <h1>{t('Your wishlist')}</h1>
      </header>
      {saved.length ? (
        <ProductGrid products={saved} label={t('Wishlist')} />
      ) : (
        <EmptyState
          title={t('Nothing saved yet')}
          description={t('Tap the heart on any snack to keep it here.')}
        />
      )}
    </main>
  );
}
