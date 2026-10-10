import { t } from '../lib/i18n';
import { X } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MOMENTS, RANGES, priceFor } from '../../shared/catalog.js';
import EmptyState from '../components/EmptyState';
import ProductGrid from '../components/ProductGrid';
import Seo from '../components/Seo';
import { useCatalog } from '../context/CatalogContext';
import { useMarket } from '../context/MarketContext';
import CatalogStatus from './CatalogStatus';
const SORTS = {
  featured: 'Featured',
  new: 'Newest',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  name: 'Name A–Z',
};
export default function Shop() {
  const [params, setParams] = useSearchParams();
  const { catalog, loading, error } = useCatalog();
  const { market } = useMarket();
  const range = Object.hasOwn(RANGES, params.get('range')) ? params.get('range') : 'all';
  const moment = Object.hasOwn(MOMENTS, params.get('moment')) ? params.get('moment') : null;
  const sort = Object.hasOwn(SORTS, params.get('sort')) ? params.get('sort') : 'featured';
  const query = (params.get('q') || '').trim().slice(0, 60);
  const visible = useMemo(() => {
    const q = query.toLowerCase();
    const list = catalog.filter(
      (p) =>
        (range === 'all' || p.range === range) &&
        (!moment || p.moments?.includes(moment)) &&
        (!q ||
          `${p.fullName} ${p.category} ${p.description} ${p.descriptionDe || ''}`
            .toLowerCase()
            .includes(q)),
    );
    const price = (p) => priceFor(p, market);
    return [...list].sort((a, b) => {
      if (sort === 'price-asc') return (price(a) ?? Infinity) - (price(b) ?? Infinity);
      if (sort === 'price-desc') return (price(b) ?? -Infinity) - (price(a) ?? -Infinity);
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'new') return Number(b.isNew) - Number(a.isNew);
      return Number(b.available) - Number(a.available) || Number(b.featured) - Number(a.featured);
    });
  }, [catalog, range, moment, sort, query, market]);
  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all' || (key === 'sort' && value === 'featured')) next.delete(key);
    else next.set(key, value);
    setParams(next, {
      replace: true,
    });
  };
  if (loading || error) return <CatalogStatus />;
  const heading = query
    ? t(`Results for “${query}”`, `Ergebnisse für „${query}“`)
    : moment
      ? MOMENTS[moment].label
      : range !== 'all'
        ? RANGES[range].label
        : 'Everything we roast';
  const lede = moment
    ? MOMENTS[moment].note
    : range !== 'all'
      ? RANGES[range].tagline
      : 'Roasted makhana and chickpea plant protein protein · all roasted, none fried.';
  return (
    <main className="page container">
      <Seo title={t(heading)} description={`${t(heading)} · ${t(lede)}`} />
      <header className="page-head">
        <p className="eyebrow">{t('Shop')}</p>
        <h1>{t(heading)}</h1>
        <p>{t(lede)}</p>
      </header>

      <div className="toolbar">
        <div className="tabs" role="group" aria-label={t('Range')}>
          {[['all', 'All'], ...Object.values(RANGES).map((r) => [r.id, r.short])].map(
            ([id, label]) => (
              <button
                key={id}
                type="button"
                className={range === id ? 'is-on' : ''}
                aria-pressed={range === id}
                onClick={() => update('range', id)}
              >
                {t(label)}
              </button>
            ),
          )}
        </div>
        <label className="select">
          <span>{t('Sort')}</span>
          <select value={sort} onChange={(e) => update('sort', e.target.value)}>
            {Object.entries(SORTS).map(([id, label]) => (
              <option key={id} value={id}>
                {t(label)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="chips" role="group" aria-label={t('Snack moment')}>
        {Object.values(MOMENTS).map((m) => (
          <button
            key={m.id}
            type="button"
            className={`chip${moment === m.id ? ' is-on' : ''}`}
            aria-pressed={moment === m.id}
            onClick={() => update('moment', moment === m.id ? null : m.id)}
          >
            {t(m.label)}
          </button>
        ))}
        {(query || moment || range !== 'all') && (
          <button
            type="button"
            className="chip chip--clear"
            onClick={() =>
              setParams(
                {},
                {
                  replace: true,
                },
              )
            }
          >
            <X size={14} aria-hidden="true" />
            {t('Clear filters')}
          </button>
        )}
      </div>

      <p className="results" role="status">
        {visible.length} {t(visible.length === 1 ? 'product' : 'products')}
      </p>
      {visible.length ? (
        <ProductGrid products={visible} eagerCount={4} label={t(heading)} />
      ) : (
        <EmptyState
          title={t('Nothing matches that yet')}
          description={t('Try another flavour, or clear the filters.')}
          action="Show everything"
          to="/shop"
        />
      )}
    </main>
  );
}
