import { useEffect, useState } from 'react';
import Field from './Field';
import { apiRequest } from '../services/apiClient';
export default function AdminSettings() {
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    apiRequest('/admin/settings')
      .then(setForm)
      .catch((e) => setMessage(e.message));
  }, []);
  if (!form) return <p>{message || 'Loading settings…'}</p>;
  const set = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));
  return (
    <form
      className="admin-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        try {
          setForm(await apiRequest('/admin/settings', { method: 'PUT', body: form }));
          setMessage('Settings saved.');
        } catch (err) {
          setMessage(
            err.message + ' ' + (err.fields || []).map((f) => f.path + ': ' + f.message).join('; '),
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Business, story and legal content</h2>
      <p>
        Publish your approved German and English legal texts. Checkout stays closed until legal and
        delivery approval are enabled. Provider credentials stay in server environment variables.
      </p>
      <div className="grid-2">
        {[
          'legalName',
          'address',
          'email',
          'phone',
          'representative',
          'register',
          'vatId',
          'returnAddress',
          'foodOperator',
          'privacyContact',
          'supervisoryAuthority',
          'retentionPolicy',
          'processors',
          'transferSafeguards',
          'disputeResolution',
          'accessibilityStatement',
          'policyVersion',
        ].map((key) => (
          <Field
            key={key}
            label={key}
            value={form[key]}
            onChange={set(key)}
            as={
              [
                'address',
                'returnAddress',
                'retentionPolicy',
                'processors',
                'transferSafeguards',
                'disputeResolution',
                'accessibilityStatement',
              ].includes(key)
                ? 'textarea'
                : 'input'
            }
          />
        ))}
      </div>
      <fieldset>
        <legend>Brand story from your PDF</legend>
        <div className="grid-2">
          {['de', 'en'].map((lang) => (
            <Field
              key={lang}
              as="textarea"
              rows={8}
              label={lang === 'de' ? 'German story' : 'English story'}
              value={form.story[lang]}
              onChange={(e) =>
                setForm((f) => ({ ...f, story: { ...f.story, [lang]: e.target.value } }))
              }
            />
          ))}
        </div>
      </fieldset>
      {['terms', 'privacy', 'withdrawal', 'shipping'].map((key) => (
        <fieldset key={key}>
          <legend>{key}</legend>
          <div className="grid-2">
            {['de', 'en'].map((lang) => (
              <Field
                key={lang}
                label={lang === 'de' ? 'German' : 'English'}
                as="textarea"
                rows={8}
                value={form.policies[lang][key]}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    policies: {
                      ...f.policies,
                      [lang]: { ...f.policies[lang], [key]: e.target.value },
                    },
                  }))
                }
              />
            ))}
          </div>
        </fieldset>
      ))}
      <fieldset>
        <legend>Delivery fees in euro cents</legend>
        <div className="grid-2">
          {['DE', 'GB'].map((m) => (
            <div key={m}>
              {form.shipping[m].map((s, i) => (
                <Field
                  key={s.id}
                  label={m + ' ' + s.id}
                  type="number"
                  min="499"
                  max="1199"
                  value={s.fee}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      shipping: {
                        ...f.shipping,
                        [m]: f.shipping[m].map((x, n) =>
                          n === i ? { ...x, fee: Number(e.target.value) } : x,
                        ),
                      },
                    }))
                  }
                />
              ))}
            </div>
          ))}
        </div>
        <label className="field">
          <span>UK fulfilment model</span>
          <select value={form.ukDeliveryMode} onChange={set('ukDeliveryMode')}>
            <option value="">Select after tax/import review</option>
            <option value="uk-stock">UK warehouse stock</option>
            <option value="ddp">Delivered Duty Paid</option>
          </select>
        </label>
      </fieldset>
      {[
        ['legalApproved', 'Legal content and seller details approved'],
        ['shippingApproved', 'Shipping prices, timings and carrier arrangements approved'],
        ['ukApproved', 'UK food labelling, VAT and customs arrangements verified'],
      ].map(([key, label]) => (
        <label className="check" key={key}>
          <input type="checkbox" checked={form[key]} onChange={set(key)} />
          {label}
        </label>
      ))}
      <p role="status">{message}</p>
      <button className="btn btn--ink" disabled={busy}>
        {busy ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  );
}
