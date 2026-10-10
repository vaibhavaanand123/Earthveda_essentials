import { t } from '../lib/i18n';
export default function AnnouncementBar() {
  return (
    <div className="announce">
      <div className="announce__track">
        <span>{t('A little more joy in every bite', 'Ein bisschen Freude in jedem Bissen')}</span>
        <span>
          {t(
            'Single pack 2,99 € · Build your own bundle',
            'Einzelpackung 2,99 € · Dein eigenes Paket',
          )}
        </span>
        <span>{t('Germany & Great Britain', 'Deutschland & Großbritannien')}</span>
      </div>
    </div>
  );
}
