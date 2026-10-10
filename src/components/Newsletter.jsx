import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/apiClient';
import { t, useLanguage } from '../lib/i18n';
import { orderingMode } from '../config';
export default function Newsletter() {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <section className="newsletter">
      <div className="container newsletter__grid">
        <div>
          <p className="eyebrow">
            {t('A LITTLE SOMETHING IN YOUR INBOX', 'EIN BISSCHEN FREUDE IM POSTFACH')}
          </p>
          <h2>{t('Good flavours. Good news.', 'Guter Geschmack. Gute Nachrichten.')}</h2>
          <p>
            {t(
              'Join for new flavours and occasional offers.',
              'Neue Sorten und gelegentliche Angebote direkt per E-Mail.',
            )}
          </p>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            try {
              await apiRequest('/newsletter', {
                method: 'POST',
                body: {
                  email,
                  language,
                  consent,
                },
              });
              setMessage(
                t(
                  'Check your email to confirm your subscription.',
                  'Bestätige deine Anmeldung über die E-Mail in deinem Postfach.',
                ),
              );
              setEmail('');
            } catch (err) {
              setMessage(t(err.message));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="newsletter__input">
            <label className="sr-only" htmlFor="newsletter-email">
              {t('Email')}
            </label>
            <input
              id="newsletter-email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder={t('Your email address', 'Deine E-Mail-Adresse')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="btn btn--ink" disabled={busy || !consent || orderingMode !== 'api'}>
              {t('Count me in', 'Ich bin dabei')}
            </button>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
            />
            <span>
              {t(
                'I want offers by email. I can unsubscribe at any time.',
                'Ich möchte Angebote per E-Mail erhalten und kann mich jederzeit abmelden.',
              )}{' '}
              <Link to="/privacy">{t('Privacy', 'Datenschutz')}</Link>
            </span>
          </label>
          <p role="status">
            {orderingMode !== 'api'
              ? t(
                  'Newsletter registration opens with the shop.',
                  'Die Newsletter-Anmeldung startet mit dem Shop.',
                )
              : message}
          </p>
        </form>
      </div>
    </section>
  );
}
