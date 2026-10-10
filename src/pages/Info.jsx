import { Link, useParams } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';
import { t, useLanguage } from '../lib/i18n';
import Seo from '../components/Seo';
import NotFound from './NotFound';
const titles = {
  about: ['Our story', 'Unsere Geschichte'],
  imprint: ['Imprint', 'Impressum'],
  terms: ['Terms of sale', 'Allgemeine Geschäftsbedingungen'],
  privacy: ['Privacy policy', 'Datenschutzerklärung'],
  returns: ['Withdrawal and returns', 'Widerruf und Rückgabe'],
  shipping: ['Shipping and payment', 'Versand und Zahlung'],
  cookies: ['Cookies and storage', 'Cookies und Speicherung'],
  contact: ['Contact', 'Kontakt'],
  faq: ['Frequently asked questions', 'Häufige Fragen'],
  accessibility: ['Accessibility', 'Barrierefreiheit'],
};
export default function Info() {
  const { page } = useParams();
  const { settings } = useCatalog();
  const { language } = useLanguage();
  if (!titles[page]) return <NotFound />;
  const title = t(...titles[page]);
  const policyKey = {
    terms: 'terms',
    privacy: 'privacy',
    returns: 'withdrawal',
    shipping: 'shipping',
  }[page];
  const policy = policyKey ? settings.policies[language][policyKey] : '';
  return (
    <main className="page container narrow prose">
      <Seo title={title} />
      <p className="eyebrow">{t('Earthveda Essentials')}</p>
      <h1>{title}</h1>
      {page === 'about' && (
        <>
          <p className="lede">
            {t('A little more joy in every bite.', 'Ein bisschen mehr Freude in jedem Bissen.')}
          </p>
          <p className="policy-copy">
            {settings.story[language] ||
              t(
                'Discover our roasted foxnuts and plant protein collection. Choose the flavours that make your everyday moments your own.',
                'Entdecke unsere gerösteten Foxnuts und unser Pflanzenprotein. Wähle die Sorten, die zu deinen Alltagsmomenten passen.',
              )}
          </p>
          <Link className="btn btn--ink" to="/shop">
            {t('Explore the range', 'Sortiment entdecken')}
          </Link>
        </>
      )}
      {page === 'imprint' && (
        <dl className="info-list">
          {[
            ['Company', 'Unternehmen', settings.legalName],
            ['Address', 'Anschrift', settings.address],
            ['Represented by', 'Vertreten durch', settings.representative],
            ['Email', 'E-Mail', settings.email],
            ['Phone', 'Telefon', settings.phone],
            ['Commercial register', 'Handelsregister', settings.register],
            ['VAT ID', 'Umsatzsteuer-ID', settings.vatId],
          ]
            .filter(([, , value]) => value)
            .map(([en, de, value]) => (
              <div key={en}>
                <dt>{t(en, de)}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          {!settings.legalApproved && (
            <p>
              {t(
                'Shop opening is being prepared. Seller information will be published before orders open.',
                'Die Shop-Eröffnung wird vorbereitet. Die Anbieterinformationen werden vor Verkaufsstart veröffentlicht.',
              )}
            </p>
          )}
          <p>{settings.disputeResolution}</p>
        </dl>
      )}
      {policyKey && (
        <>
          {policy ? (
            <div className="policy-copy">{policy}</div>
          ) : (
            <p>
              {t(
                'This shop is being prepared for launch. The final policy will be published before checkout opens.',
                'Dieser Shop wird für den Verkaufsstart vorbereitet. Die endgültigen Informationen werden vor Freischaltung der Kasse veröffentlicht.',
              )}
            </p>
          )}
          {page === 'returns' && (
            <>
              <Link className="btn btn--ink" to="/withdraw">
                {t('Withdraw from contract', 'Vertrag widerrufen')}
              </Link>
              <h2>{t('Model withdrawal form', 'Muster-Widerrufsformular')}</h2>
              <p>
                {t('To:', 'An:')} {settings.legalName}, {settings.returnAddress}, {settings.email}
              </p>
              <p>
                {t(
                  'I hereby withdraw from the contract for the purchase of the following goods:',
                  'Hiermit widerrufe ich den Vertrag über den Kauf der folgenden Waren:',
                )}
              </p>
              <ul>
                <li>{t('Goods and order number', 'Waren und Bestellnummer')}</li>
                <li>{t('Ordered on / received on', 'Bestellt am / erhalten am')}</li>
                <li>{t('Name and address of consumer', 'Name und Anschrift des Verbrauchers')}</li>
                <li>
                  {t(
                    'Date and signature, only for paper submissions',
                    'Datum und Unterschrift, nur bei Papiererklärung',
                  )}
                </li>
              </ul>
            </>
          )}
          {page === 'shipping' && (
            <>
              <div className="table-wrap">
                <table className="info-table">
                  <thead>
                    <tr>
                      <th>{t('Country', 'Land')}</th>
                      <th>{t('Service', 'Versandart')}</th>
                      <th>{t('Fee', 'Preis')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(settings.shipping).flatMap(([market, rates]) =>
                      rates.map((rate) => (
                        <tr key={market + rate.id}>
                          <td>
                            {market === 'DE'
                              ? t('Germany', 'Deutschland')
                              : t('Great Britain', 'Großbritannien')}
                          </td>
                          <td>{t(rate.label)}</td>
                          <td>
                            {(rate.fee / 100).toLocaleString('de-DE', {
                              minimumFractionDigits: 2,
                            })}{' '}
                            €
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
              <p>
                {t(
                  'All prices are in euros. Available payment methods are displayed by the payment provider.',
                  'Alle Preise in Euro. Verfügbare Zahlungsmethoden werden beim Zahlungsanbieter angezeigt.',
                )}
              </p>
            </>
          )}
        </>
      )}
      {page === 'cookies' && (
        <>
          <p>
            {t(
              'We use necessary browser storage for your basket, wishlist, delivery country and language. Staff login uses a secure session cookie. No optional marketing or analytics trackers are enabled.',
              'Wir verwenden notwendige Browserspeicherung für Warenkorb, Merkliste, Lieferland und Sprache. Der Mitarbeiterzugang nutzt ein sicheres Sitzungscookie. Optionale Marketing- oder Analyse-Tracker sind nicht aktiviert.',
            )}
          </p>
          <p>
            {t(
              'If optional tracking is added, it must remain off until you consent.',
              'Falls optionales Tracking hinzugefügt wird, bleibt es bis zu deiner Einwilligung deaktiviert.',
            )}
          </p>
        </>
      )}
      {page === 'accessibility' && (
        <p className="policy-copy">
          {settings.accessibilityStatement ||
            t(
              'The shop supports keyboard navigation, visible focus, responsive layouts and reduced motion. For assistance, please contact us. The final accessibility statement will be published before launch.',
              'Der Shop unterstützt Tastaturbedienung, sichtbaren Fokus, responsive Darstellung und reduzierte Animationen. Kontaktiere uns bei Unterstützungsbedarf. Die endgültige Erklärung zur Barrierefreiheit wird vor Verkaufsstart veröffentlicht.',
            )}
        </p>
      )}
      {page === 'contact' && (
        <>
          <p>
            {t(
              'Have a question about your order? Include your order number.',
              'Fragen zu deiner Bestellung? Bitte gib deine Bestellnummer an.',
            )}
          </p>
          {settings.email && (
            <p>
              <a href={'mailto:' + settings.email}>{settings.email}</a>
            </p>
          )}
          {settings.phone && (
            <p>
              <a href={'tel:' + settings.phone}>{settings.phone}</a>
            </p>
          )}
          <Link to="/track">{t('Track an order', 'Bestellung verfolgen')}</Link>
        </>
      )}
      {page === 'faq' && (
        <div className="faq">
          <details>
            <summary>
              {t('How do I prepare plant protein?', 'Wie bereite ich Pflanzenprotein zu?')}
            </summary>
            <p>
              {t(
                'Mix with water or milk. Follow the serving instructions on the product label.',
                'Mit Wasser oder Milch mischen. Beachte die Portionsangaben auf dem Produktetikett.',
              )}
            </p>
          </details>
          <details>
            <summary>{t('How do I see order updates?', 'Wie erhalte ich Bestellupdates?')}</summary>
            <p>
              {t(
                'Use the secure link in your confirmation email or the order tracking page. WhatsApp updates are optional.',
                'Nutze den sicheren Link in der Bestätigungs-E-Mail oder die Bestellverfolgung. WhatsApp-Updates sind optional.',
              )}
            </p>
          </details>
          <details>
            <summary>
              {t(
                'Where can I read ingredients and allergens?',
                'Wo finde ich Zutaten und Allergene?',
              )}
            </summary>
            <p>
              {t(
                'Every product page and the final checkout show the verified food information before purchase.',
                'Jede Produktseite und die Kasse zeigen die geprüften Lebensmittelinformationen vor dem Kauf.',
              )}
            </p>
          </details>
        </div>
      )}
    </main>
  );
}
