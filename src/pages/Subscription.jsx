import { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../services/apiClient';
import { t } from '../lib/i18n';
export default function Subscription() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const unsubscribe = pathname === '/unsubscribe';
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <main className="page container narrow">
      <h1>
        {unsubscribe
          ? t('Unsubscribe', 'Abmelden')
          : t('Confirm subscription', 'Anmeldung bestätigen')}
      </h1>
      <p>{t('Please confirm your choice.', 'Bitte bestätige deine Auswahl.')}</p>
      <button
        className="btn btn--ink"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await apiRequest(
              unsubscribe ? '/newsletter/unsubscribe' : '/newsletter/confirm',
              { method: 'POST', body: { token: params.get('token') } },
            );
            setMessage(t(r.message));
          } catch (e) {
            setMessage(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {unsubscribe
          ? t('Unsubscribe', 'Abmelden')
          : t('Confirm subscription', 'Anmeldung bestätigen')}
      </button>
      <p role="status">{message}</p>
    </main>
  );
}
