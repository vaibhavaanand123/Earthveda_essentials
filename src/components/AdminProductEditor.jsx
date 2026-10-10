import { useState } from 'react';
import Field from './Field';
import { apiRequest } from '../services/apiClient';
const blank = {
  id: '',
  slug: '',
  sku: '',
  name: '',
  fullName: '',
  range: 'makhana',
  category: 'Roasted foxnuts',
  description: '',
  descriptionDe: '',
  image: '/images/cream-onion.webp',
  accent: '#2f6b35',
  netWeightGrams: null,
  sizeLabel: '',
  available: true,
  published: false,
  complianceReady: false,
  stock: 0,
  prices: { DE: 299, GB: 299 },
  taxRates: { DE: null, GB: null },
  ingredients: { de: '', en: '' },
  allergens: { de: '', en: '' },
  storage: { de: '', en: '' },
  nutrition: null,
  foodOperator: '',
  origin: '',
  howToEnjoy: '',
  highlights: [],
  moments: [],
  featured: false,
  isNew: false,
};
const nutrients = [
  'energyKj',
  'energyKcal',
  'fat',
  'saturates',
  'carbohydrate',
  'sugars',
  'protein',
  'salt',
];
export default function AdminProductEditor({ product, onSave, onClose }) {
  const [form, setForm] = useState(() => structuredClone(product || blank));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const change = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]:
        e.target.type === 'checkbox'
          ? e.target.checked
          : e.target.type === 'number'
            ? e.target.value === ''
              ? null
              : Number(e.target.value)
            : e.target.value,
    }));
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest(product ? '/admin/products/' + product.id : '/admin/products', {
        method: product ? 'PUT' : 'POST',
        body: form,
      });
      onSave();
    } catch (err) {
      setError(
        err.message +
          (err.fields?.length
            ? ' ' + err.fields.map((f) => f.path + ': ' + f.message).join('; ')
            : ''),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="admin-editor" onSubmit={save}>
      <header className="admin__head">
        <h2>{product ? 'Edit ' + product.name : 'Create product'}</h2>
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Close
        </button>
      </header>
      <p>
        Prices use euro cents: 299 = 2,99 €. Stock means total on hand. Current reservations:{' '}
        {product?.reserved || 0}. Archive a product to remove it from the storefront and keep
        historical orders.
      </p>
      <div className="grid-2">
        {[
          'id',
          'slug',
          'sku',
          'name',
          'fullName',
          'category',
          'sizeLabel',
          'origin',
          'foodOperator',
        ].map((key) => (
          <Field
            key={key}
            name={key}
            label={key}
            required={['id', 'slug', 'sku', 'name', 'fullName'].includes(key)}
            readOnly={key === 'id' && !!product}
            value={form[key]}
            onChange={change(key)}
            maxLength={500}
          />
        ))}
        <label className="field">
          <span>Range</span>
          <select value={form.range} onChange={change('range')}>
            <option value="makhana">Roasted foxnuts</option>
            <option value="protein">Plant protein</option>
          </select>
        </label>
        <Field label="Accent colour" type="color" value={form.accent} onChange={change('accent')} />
        <Field
          label="Net weight (g)"
          type="number"
          min="1"
          value={form.netWeightGrams ?? ''}
          onChange={change('netWeightGrams')}
        />
        <Field
          label="Stock on hand"
          type="number"
          min={product?.reserved || 0}
          value={form.stock}
          onChange={change('stock')}
        />
      </div>
      <Field
        as="textarea"
        label="English description"
        value={form.description}
        onChange={change('description')}
        required
      />
      <Field
        as="textarea"
        label="German description"
        value={form.descriptionDe}
        onChange={change('descriptionDe')}
      />
      <Field
        as="textarea"
        label="Preparation instructions"
        value={form.howToEnjoy}
        onChange={change('howToEnjoy')}
      />
      <fieldset>
        <legend>Image</legend>
        <img className="admin-image-preview" src={form.image} alt="Product preview" />
        <Field label="Image path" value={form.image} onChange={change('image')} />
        <label className="field">
          <span>Upload PNG, JPEG or WebP, maximum 2 MB</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) {
                setError('Image is larger than 2 MB.');
                return;
              }
              try {
                const r = await fetch('/api/admin/images', {
                  method: 'POST',
                  headers: { 'Content-Type': file.type },
                  body: file,
                  credentials: 'same-origin',
                });
                const data = await r.json();
                if (!r.ok) throw new Error(data.error?.message || 'Upload failed');
                setForm((f) => ({ ...f, image: data.path }));
              } catch (err) {
                setError(err.message);
              }
            }}
          />
        </label>
      </fieldset>
      <fieldset>
        <legend>Prices and tax rates</legend>
        <div className="grid-2">
          {['DE', 'GB'].map((m) => (
            <div key={m}>
              <Field
                label={m + ' price (euro cents)'}
                type="number"
                min="1"
                value={form.prices[m]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, prices: { ...f.prices, [m]: Number(e.target.value) } }))
                }
              />
              <Field
                label={m + ' VAT rate (%), verify with accountant'}
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.taxRates[m] ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    taxRates: {
                      ...f.taxRates,
                      [m]: e.target.value === '' ? null : Number(e.target.value),
                    },
                  }))
                }
              />
            </div>
          ))}
        </div>
      </fieldset>
      {['ingredients', 'allergens', 'storage'].map((key) => (
        <fieldset key={key}>
          <legend>{key}</legend>
          <div className="grid-2">
            {['de', 'en'].map((lang) => (
              <Field
                key={lang}
                as="textarea"
                label={lang === 'de' ? 'German' : 'English'}
                value={form[key][lang]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: { ...f[key], [lang]: e.target.value } }))
                }
              />
            ))}
          </div>
        </fieldset>
      ))}
      <fieldset>
        <legend>Nutrition per 100 g, from approved label</legend>
        <div className="grid-2">
          {nutrients.map((key) => (
            <Field
              key={key}
              label={key}
              type="number"
              step="0.01"
              min="0"
              value={form.nutrition?.[key] ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  nutrition: { ...f.nutrition, [key]: Number(e.target.value) },
                }))
              }
            />
          ))}
        </div>
      </fieldset>
      <div className="admin-checks">
        {[
          ['available', 'Allow purchase when stock exists'],
          ['published', 'Show in storefront'],
          ['complianceReady', 'I verified food information, label, claims and tax rates'],
          ['featured', 'Feature product'],
        ].map(([key, label]) => (
          <label key={key} className="check">
            <input type="checkbox" checked={form[key]} onChange={change(key)} />
            {label}
          </label>
        ))}
      </div>
      <p className="form-status" role="alert">
        {error}
      </p>
      <button className="btn btn--ink" disabled={busy}>
        {busy ? 'Saving…' : 'Save product'}
      </button>
    </form>
  );
}
