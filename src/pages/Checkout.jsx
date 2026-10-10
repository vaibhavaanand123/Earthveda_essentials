import { useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useMarket } from '../context/MarketContext';
import { useCatalog } from '../context/CatalogContext';
import Field from '../components/Field';
import CartLines from '../components/CartLines';
import Seo from '../components/Seo';
import FoodInformation from '../components/FoodInformation';
import { apiRequest } from '../services/apiClient';
import { uuid } from '../lib/uuid';
import { t, useLanguage } from '../lib/i18n';
import CatalogStatus from './CatalogStatus';
const empty = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  street: '',
  unit: '',
  postalCode: '',
  city: '',
  note: '',
  whatsappOptIn: false,
  acceptTerms: false,
  website: '',
};
export default function Checkout() {
  const cart = useCart();
  const { market, settings: marketSettings, money } = useMarket();
  const { settings, checkoutEnabled, whatsappEnabled } = useCatalog();
  const { language } = useLanguage();
  const [form, setForm] = useState(empty);
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const attempt = useRef(null);
  const submitting = useRef(false);
  if (!cart.ready) return <CatalogStatus />;
  if (!cart.lines.length) return <Navigate to="/cart" replace />;
  const rate = settings.shipping[market].find((s) => s.id === shippingMethod);
  const total = cart.subtotal + rate.fee;
  const enabled =
    checkoutEnabled &&
    (market !== 'GB' || settings.ukApproved) &&
    cart.lines.every((l) => l.product.complianceReady && !l.issue);
  const update = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));
  async function submit(e) {
    e.preventDefault();
    if (submitting.current || !enabled) return;
    submitting.current = true;
    setBusy(true);
    setMessage('');
    const draft = {
      market,
      language,
      shippingMethod,
      paymentMethod: 'stripe',
      items: cart.lines.map((l) => ({
        productId: l.id,
        quantity: l.quantity,
      })),
      customer: Object.fromEntries(
        ['firstName', 'lastName', 'email', 'phone', 'street', 'unit', 'postalCode', 'city'].map(
          (key) => [key, form[key].trim()],
        ),
      ),
      note: form.note,
      whatsappOptIn: form.whatsappOptIn,
      acceptTerms: form.acceptTerms,
      website: form.website,
    };
    try {
      const bytes = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify(draft)),
      );
      const fp = Array.from(new Uint8Array(bytes))
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('');
      let saved;
      try {
        saved = JSON.parse(sessionStorage.getItem('earthveda-checkout-attempt') || 'null');
      } catch {}
      if (attempt.current?.fingerprint !== fp)
        attempt.current =
          saved?.fingerprint === fp
            ? saved
            : {
                fingerprint: fp,
                key: uuid(),
              };
      try {
        sessionStorage.setItem('earthveda-checkout-attempt', JSON.stringify(attempt.current));
      } catch {}
      const result = await apiRequest('/orders', {
        method: 'POST',
        body: draft,
        headers: {
          'Idempotency-Key': attempt.current.key,
        },
      });
      if (result.paid) {
        cart.clear();
        window.location.assign('/order/' + result.order.orderNumber);
        return;
      }
      const destination = new URL(result.checkoutUrl);
      if (destination.protocol !== 'https:' || destination.hostname !== 'checkout.stripe.com')
        throw new Error('Invalid payment destination.');
      window.location.assign(destination.href);
    } catch (error) {
      setMessage(error.message);
      if (['checkout_expired', 'checkout_finished'].includes(error.code)) {
        attempt.current = null;
        try {
          sessionStorage.removeItem('earthveda-checkout-attempt');
        } catch {}
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="page container">
      <Seo title={t('Checkout', 'Kasse')} noindex />
      <header className="page-head">
        <p className="eyebrow">{t('ONE LAST STEP', 'NUR NOCH EIN SCHRITT')}</p>
        <h1>{t('Good things are on the way.', 'Gute Dinge sind unterwegs.')}</h1>
        <p>
          {t(
            'All amounts are in euros, including applicable taxes.',
            'Alle Beträge in Euro, inklusive anwendbarer Steuern.',
          )}
        </p>
      </header>
      <div className="split">
        <form className="checkout" onSubmit={submit}>
          {!enabled && (
            <p className="notice">
              {t(
                'Online checkout opens once the products and delivery service are ready.',
                'Der Online-Kauf startet, sobald Produkte und Versand bereit sind.',
              )}
            </p>
          )}
          <fieldset>
            <legend>{t('Contact', 'Kontakt')}</legend>
            <div className="grid-2">
              {[
                ['firstName', t('First name', 'Vorname'), 'text', 'given-name'],
                ['lastName', t('Last name', 'Nachname'), 'text', 'family-name'],
                ['email', t('Email', 'E-Mail'), 'email', 'email'],
                ['phone', t('Phone number', 'Telefonnummer'), 'tel', 'tel'],
              ].map(([name, label, type, autoComplete]) => (
                <Field
                  key={name}
                  name={name}
                  label={label}
                  type={type}
                  autoComplete={autoComplete}
                  value={form[name]}
                  onChange={update(name)}
                  maxLength={name === 'email' ? 254 : 80}
                  required
                />
              ))}
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={form.whatsappOptIn}
                disabled={!whatsappEnabled}
                onChange={update('whatsappOptIn')}
              />
              <span>
                {t(
                  'Send order updates on WhatsApp. Optional.',
                  'Bestellupdates per WhatsApp senden. Optional.',
                )}
              </span>
            </label>
          </fieldset>
          <fieldset>
            <legend>
              {t('Delivery address', 'Lieferadresse')} · {t(marketSettings.name)}
            </legend>
            <div className="grid-2">
              {[
                ['street', t('Street and house number', 'Straße und Hausnummer'), 'address-line1'],
                ['unit', t('Apartment / c/o', 'Wohnung / c/o'), 'address-line2'],
                ['postalCode', t('Postcode', 'Postleitzahl'), 'postal-code'],
                ['city', t('City', 'Ort'), 'address-level2'],
              ].map(([name, label, autoComplete]) => (
                <Field
                  key={name}
                  label={label}
                  name={name}
                  value={form[name]}
                  onChange={update(name)}
                  autoComplete={autoComplete}
                  required={name !== 'unit'}
                  maxLength={name === 'postalCode' ? 10 : 160}
                />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>{t('Delivery service', 'Versandart')}</legend>
            <div className="pay-options">
              {settings.shipping[market].map((s) => (
                <label key={s.id} className={`pay ${shippingMethod === s.id ? 'is-on' : ''}`}>
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === s.id}
                    onChange={() => setShippingMethod(s.id)}
                  />
                  <span>
                    <strong>
                      {t(s.label)} · {money(s.fee)}
                    </strong>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>{t('Payment', 'Zahlung')}</legend>
            <div className="payment-brands">
              <span>{t('Visa')}</span>
              <span>{t('Mastercard')}</span>
              <span>{t('Amex')}</span>
              <span>{t('PayPal')}</span>
              <span>{t('Klarna')}</span>
              <span>{t('Apple Pay')}</span>
              <span>{t('Google Pay')}</span>
            </div>
            <p>
              {t(
                'Available methods are displayed securely by our payment provider. Your bank may convert EUR to GBP for UK cards.',
                'Verfügbare Zahlarten werden sicher beim Zahlungsanbieter angezeigt. Bei britischen Karten kann deine Bank EUR in GBP umrechnen.',
              )}
            </p>
            <Field
              as="textarea"
              name="note"
              label={t('Delivery note', 'Lieferhinweis')}
              value={form.note}
              onChange={update('note')}
              maxLength={300}
              rows={2}
            />
          </fieldset>
          <div className="hp" aria-hidden="true">
            <input tabIndex={-1} name="website" value={form.website} onChange={update('website')} />
          </div>
          <label className="check">
            <input
              type="checkbox"
              required
              checked={form.acceptTerms}
              onChange={update('acceptTerms')}
            />
            <span>
              {t('I accept the', 'Ich akzeptiere die')}{' '}
              <Link to="/terms" target="_blank">
                {t('Terms', 'AGB')}
              </Link>{' '}
              {t(
                'and have read the privacy and withdrawal information.',
                'und habe die Datenschutz- und Widerrufsinformationen gelesen.',
              )}{' '}
              <Link to="/privacy" target="_blank">
                {t('Privacy', 'Datenschutz')}
              </Link>{' '}
              ·{' '}
              <Link to="/returns" target="_blank">
                {t('Withdrawal', 'Widerruf')}
              </Link>
            </span>
          </label>
          <div className="checkout-final">
            <h2>{t('Review your order', 'Bestellung prüfen')}</h2>
            <CartLines compact />
            <dl className="totals">
              <div>
                <dt>{t('Subtotal', 'Zwischensumme')}</dt>
                <dd>{money(cart.subtotal)}</dd>
              </div>
              <div>
                <dt>{t('Delivery', 'Versand')}</dt>
                <dd>{money(rate.fee)}</dd>
              </div>
              <div className="totals__grand">
                <dt>{t('Total', 'Gesamtbetrag')}</dt>
                <dd>{money(total)}</dd>
              </div>
            </dl>
            <p>{t('Includes taxes. One-time purchase.', 'Inklusive Steuern. Einmaliger Kauf.')}</p>
            <p role="alert">{message}</p>
            <button className="btn btn--ink btn--block btn--lg" disabled={busy || !enabled}>
              <Lock size={18} />
              {busy
                ? t('Opening secure payment…', 'Sichere Zahlung wird geöffnet…')
                : t('Order with obligation to pay', 'Zahlungspflichtig bestellen')}{' '}
              · {money(total)}
            </button>
          </div>
        </form>
        <aside className="summary">
          <h2>{t('The details matter', 'Die Details zählen')}</h2>
          <p>
            {t(
              'Ingredients and allergens for every flavour in your bag.',
              'Zutaten und Allergene für jede Sorte in deinem Warenkorb.',
            )}
          </p>
          {cart.lines.map((l) => (
            <details key={l.id}>
              <summary>{l.product.name}</summary>
              <FoodInformation product={l.product} />
            </details>
          ))}
          <Link to="/cart" className="link">
            {t('Edit bag', 'Warenkorb bearbeiten')}
          </Link>
        </aside>
      </div>
    </main>
  );
}
