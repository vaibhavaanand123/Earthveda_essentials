import { ArrowRight, Truck, Lock, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import HeroSlider from '../components/HeroSlider';
import ProductGrid from '../components/ProductGrid';
import BundleQuiz from '../components/BundleQuiz';
import Seo from '../components/Seo';
import { useCatalog } from '../context/CatalogContext';
import { t, useLanguage } from '../lib/i18n';
import CatalogStatus from './CatalogStatus';
export default function Home() {
  const { catalog, loading, error, settings } = useCatalog();
  const { language } = useLanguage();
  if (loading || error || !catalog.length) return <CatalogStatus />;
  const foxnuts = catalog.filter((p) => p.range === 'makhana');
  const protein = catalog.filter((p) => p.range === 'protein');
  return (
    <main>
      <Seo
        title={t('A little joy in every bite', 'Ein bisschen Freude in jedem Bissen')}
        description={t(
          'Discover roasted foxnuts and plant protein. Create your own flavour bundle.',
          'Entdecke geröstete Foxnuts und Pflanzenprotein. Stelle dein eigenes Paket zusammen.',
        )}
      />
      <HeroSlider catalog={catalog} />
      <section className="strip">
        <ul className="container strip__row">
          <li>
            <Truck size={18} />
            {t('Germany & Great Britain', 'Deutschland & Großbritannien')}
          </li>
          <li>
            <Lock size={18} />
            {t('Secure hosted checkout', 'Sicherer Zahlungsprozess')}
          </li>
          <li>
            <Package size={18} />
            {t('8 packs 23,92 € · 16 packs 47,84 €', '8er-Paket 23,92 € · 16er-Paket 47,84 €')}
          </li>
        </ul>
      </section>
      <section className="section container">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t('YOUR NEW SNACK RITUAL', 'DEIN NEUES SNACKRITUAL')}</p>
            <h2>{t('Small snack. Big personality.', 'Kleiner Snack. Großer Geschmack.')}</h2>
            <p>
              {t(
                'Find your favourite crunch, from creamy classics to a little heat.',
                'Finde deinen Lieblingssnack: cremige Klassiker oder eine Prise Schärfe.',
              )}
            </p>
          </div>
          <Link className="link" to="/shop?range=makhana">
            {t('Explore foxnuts', 'Foxnuts entdecken')} <ArrowRight size={18} />
          </Link>
        </div>
        <ProductGrid products={foxnuts} eagerCount={4} />
      </section>
      <BundleQuiz />
      <section className="protein">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">
                {t('A PLANT-BASED POINT OF VIEW', 'EINE PFLANZLICHE PERSPEKTIVE')}
              </p>
              <h2>{t('Shake up your everyday.', 'Frischer Schwung für deinen Alltag.')}</h2>
              <p>
                {t(
                  'Mango, Royal Cream and Chocolate. Mix with cold water or your favourite milk.',
                  'Mango, Royal Cream und Schokolade. Mit kaltem Wasser oder deiner Lieblingsmilch mischen.',
                )}
              </p>
            </div>
            <Link className="link" to="/shop?range=protein">
              {t('Discover plant protein', 'Pflanzenprotein entdecken')}
            </Link>
          </div>
          <ProductGrid products={protein} variant="three" />
          <div className="ways">
            <h3>{t('Simple to make. Easy to love.', 'Einfach zubereitet. Schnell verliebt.')}</h3>
            <ol className="ways__list">
              {[
                [
                  t('With water', 'Mit Wasser'),
                  t(
                    'Shake with cold water and ice. Follow the serving directions on the label.',
                    'Mit kaltem Wasser und Eis shaken. Beachte die Zubereitung auf dem Etikett.',
                  ),
                ],
                [
                  t('With milk', 'Mit Milch'),
                  t(
                    'Try dairy or plant-based milk for a creamy drink.',
                    'Mit Milch oder Pflanzendrink cremig genießen.',
                  ),
                ],
                [
                  t('In a smoothie', 'Im Smoothie'),
                  t(
                    'Blend with banana or mango for your own flavour ritual.',
                    'Mit Banane oder Mango mixen und deine Lieblingskombination entdecken.',
                  ),
                ],
              ].map(([title, text]) => (
                <li key={title}>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
      <section className="section container story-teaser">
        <p className="eyebrow">{t('THE EARTHVEDA WAY', 'DIE EARTHVEDA WELT')}</p>
        <h2>{t('Snack with good intention.', 'Snacken mit gutem Gefühl.')}</h2>
        <p>
          {settings.story[language] ||
            t(
              'Roasted foxnuts and plant protein, in flavours made for your everyday moments.',
              'Geröstete Foxnuts und Pflanzenprotein. Geschmacksrichtungen für deine kleinen Alltagsmomente.',
            )}
        </p>
        <Link className="btn btn--ink" to="/about">
          {t('Meet Earthveda', 'Earthveda entdecken')}
        </Link>
      </section>
      <section className="section container faq-teaser">
        <div className="section-head">
          <h2>{t('A few good questions.', 'Gute Fragen. Klare Antworten.')}</h2>
        </div>
        <div className="faq">
          <details>
            <summary>
              {t(
                'Can I choose the flavours in my bundle?',
                'Kann ich mein Paket selbst zusammenstellen?',
              )}
            </summary>
            <p>
              {t(
                'Yes. Choose four flavours and get two of each in an 8 pack, or four of each in a 16 pack.',
                'Ja. Wähle vier Sorten. Im 8er-Paket erhältst du je zwei, im 16er-Paket je vier Packungen.',
              )}
            </p>
          </details>
          <details>
            <summary>{t('What will shipping cost?', 'Wie viel kostet der Versand?')}</summary>
            <p>
              {t(
                'Between 4,99 € and 11,99 €, depending on country and delivery service. Your exact total is shown before payment.',
                'Je nach Land und Versandart zwischen 4,99 € und 11,99 €. Der genaue Gesamtbetrag wird vor der Zahlung angezeigt.',
              )}
            </p>
          </details>
          <details>
            <summary>{t('How can I pay?', 'Wie kann ich bezahlen?')}</summary>
            <p>
              {t(
                'Eligible cards, PayPal, Klarna and wallets are offered by the payment provider at checkout. Availability depends on your location and our merchant account.',
                'Geeignete Karten, PayPal, Klarna und Wallets werden vom Zahlungsanbieter angeboten. Die Verfügbarkeit hängt vom Standort und Händlerkonto ab.',
              )}
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}
