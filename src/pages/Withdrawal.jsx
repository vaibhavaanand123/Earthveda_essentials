import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Field from '../components/Field';
import { apiRequest } from '../services/apiClient';
import { uuid } from '../lib/uuid';
import { t } from '../lib/i18n';
import { useCatalog } from '../context/CatalogContext';
import { orderingMode } from '../config';
export default function Withdrawal() {
  const { settings } = useCatalog();
  const [form, setForm] = useState({ name: '', orderNumber: '', email: '', details: '' });
  const [receipt, setReceipt] = useState(null);
  const [review, setReview] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const key = useRef(uuid());
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    key.current = uuid();
  };
  async function submit(e) {
    e.preventDefault();
    if (!review) {
      setReview(true);
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const r = await apiRequest('/withdrawals', {
        method: 'POST',
        headers: { 'Idempotency-Key': key.current },
        body: { ...form, confirm: true },
      });
      setReceipt(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page container narrow prose">
      <p className="eyebrow">{t('Withdrawal', 'Widerruf')}</p>
      <h1>{t('Withdraw from contract', 'Vertrag widerrufen')}</h1>
      <p>
        {t(
          'Use this form to send your withdrawal declaration. No account is needed. You may also contact us by email.',
          'Sende hier deine Widerrufserklärung. Ein Konto ist nicht erforderlich. Du kannst uns auch per E-Mail kontaktieren.',
        )}
      </p>
      {settings.email && <a href={'mailto:' + settings.email}>{settings.email}</a>}
      {receipt ? (
        <div role="status">
          <h2>{t('Declaration received', 'Erklärung eingegangen')}</h2>
          <p>
            {receipt.orderNumber} · {receipt.receivedAt}
          </p>
          <p>
            {t(
              'A receipt will be sent by email. Save this reference:',
              'Eine Eingangsbestätigung wird per E-Mail gesendet. Bitte bewahre diese Referenz auf:',
            )}{' '}
            {receipt.id}
          </p>
          <button
            className="btn btn--ink"
            onClick={() => {
              const text = [
                'Earthveda Essentials',
                'Withdrawal receipt / Widerrufsbestätigung',
                receipt.name,
                receipt.orderNumber,
                receipt.email,
                receipt.details,
                'Received / Eingegangen: ' + receipt.receivedAt,
                'Reference / Referenz: ' + receipt.id,
              ].join('\n');
              const url = URL.createObjectURL(
                new Blob([text], { type: 'text/plain;charset=utf-8' }),
              );
              Object.assign(document.createElement('a'), {
                href: url,
                download: 'earthveda-withdrawal-' + receipt.id + '.txt',
              }).click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            {t('Download receipt', 'Bestätigung herunterladen')}
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          {[
            ['name', t('Name', 'Name')],
            ['orderNumber', t('Contract / order number', 'Vertrags- / Bestellnummer')],
            ['email', t('Email for confirmation', 'E-Mail für die Bestätigung')],
            [
              'details',
              t(
                'Items or part of contract, if applicable',
                'Artikel oder Vertragsteil, falls zutreffend',
              ),
            ],
          ].map(([name, label]) => (
            <Field
              key={name}
              name={name}
              label={label}
              value={form[name]}
              onChange={set(name)}
              type={name === 'email' ? 'email' : 'text'}
              required={name !== 'details'}
              maxLength={name === 'details' ? 2000 : 254}
            />
          ))}
          {review && (
            <p>
              {t(
                'Check the details above, then confirm your withdrawal.',
                'Prüfe die Angaben oben und bestätige dann deinen Widerruf.',
              )}
            </p>
          )}
          <p role="alert">{error}</p>
          <button className="btn btn--ink" disabled={busy || orderingMode !== 'api'}>
            {review
              ? t('Confirm withdrawal', 'Widerruf bestätigen')
              : t('Review withdrawal', 'Widerruf prüfen')}
          </button>
        </form>
      )}
      <p>
        <Link to="/returns">
          {t('Read withdrawal information', 'Widerrufsinformationen lesen')}
        </Link>
      </p>
    </main>
  );
}
