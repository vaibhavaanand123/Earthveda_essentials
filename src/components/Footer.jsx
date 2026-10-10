import { t } from '../lib/i18n';
import Newsletter from './Newsletter';
import { useCatalog } from '../context/CatalogContext';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BUSINESS } from '../../shared/business.js';
import { useMarket } from '../context/MarketContext';
import { LeafMark } from './Logo';
export default function Footer() {
  const { settings } = useMarket();
  const { settings: business } = useCatalog();
  return (
    <>
      <Newsletter />
      <footer className="footer">
        <div className="container footer__grid">
          <div className="footer__brand">
            <p className="footer__mark">
              <LeafMark size={36} />
              {t('earthveda')}
            </p>
            <p>{t('Roasted foxnuts and plant protein. A little joy in every bite.')}</p>
            <a href={BUSINESS.instagram} target="_blank" rel="noopener noreferrer" className="link">
              {t('Instagram')}
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
          <nav aria-label={t('Shop')}>
            <h3>{t('Shop')}</h3>
            <Link to="/shop?range=makhana">{t('Roasted makhana')}</Link>
            <Link to="/shop?range=protein">{t('Plant protein')}</Link>
            <Link to="/shop">{t('Shop all')}</Link>
          </nav>
          <nav aria-label={t('Help')}>
            <h3>{t('Help')}</h3>
            <Link to="/track">{t('Track an order')}</Link>
            <Link to="/shipping">{t('Delivery')}</Link>
            <Link to="/returns">{t('Returns & refunds')}</Link>
            <Link to="/faq">{t('FAQs')}</Link>
            <Link to="/contact">{t('Contact')}</Link>
          </nav>
          <nav aria-label={t('Legal')}>
            <h3>{t('Legal')}</h3>
            <Link to="/terms">{t('Terms')}</Link>
            <Link to="/privacy">{t('Privacy')}</Link>
            <Link to="/cookies">{t('Cookies')}</Link>
            <Link to="/imprint">{t('Imprint')}</Link>
            <Link className="footer__withdraw" to="/withdraw">
              {t('Withdraw from contract', 'Vertrag widerrufen')}
            </Link>
            <Link to="/accessibility">{t('Accessibility', 'Barrierefreiheit')}</Link>
          </nav>
        </div>
        <div className="container footer__base">
          <span>
            © {new Date().getFullYear()} {business.legalName || BUSINESS.brand}
          </span>
          <span>
            {t('Delivering to')}
            {settings.name}
            {t('\xB7 Prices in')}
            {settings.currency}
            {t(' incl. taxes, plus shipping', ' inkl. Steuern, zzgl. Versand')}
          </span>
        </div>
      </footer>
    </>
  );
}
