import { t } from '../lib/i18n';
import EmptyState from '../components/EmptyState';
import Seo from '../components/Seo';
export default function NotFound() {
  return (
    <main className="page container">
      <Seo title={t('Page not found')} description={t('This page could not be found.')} noindex />
      <EmptyState
        title={t('This page rolled away')}
        description={t('The link may be old or mistyped.')}
        action="Back to the shop"
        to="/shop"
      />
    </main>
  );
}
