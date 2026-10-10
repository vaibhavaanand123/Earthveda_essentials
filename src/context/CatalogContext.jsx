import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { config } from '../config';
import { apiRequest } from '../services/apiClient';
import { DEFAULT_SETTINGS } from '../../shared/business';
import { products as previewProducts } from '../../shared/catalog.js';
import { productService } from '../services/productService';

const CatalogContext = createContext(null);
const isApi = config.catalogMode === 'api';

export function CatalogProvider({ children }) {
  const [state, setState] = useState({
    catalog: isApi ? [] : previewProducts,
    loading: isApi,
    error: false,
    settings: DEFAULT_SETTINGS,
    checkoutEnabled: false,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isApi) return undefined;
    const controller = new AbortController();
    Promise.all([
      productService.list({ signal: controller.signal, fresh: attempt > 0 }),
      apiRequest('/config', { signal: controller.signal }),
    ])
      .then(([catalog, runtime]) => setState({ catalog, loading: false, error: false, ...runtime }))
      .catch(() => {
        if (!controller.signal.aborted) setState((s) => ({ ...s, loading: false, error: true }));
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: false }));
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo(() => {
    const byId = new Map(state.catalog.map((p) => [p.id, p]));
    return {
      ...state,
      retry,
      byId,
      findBySlug: (slug) => state.catalog.find((p) => p.slug === slug) ?? null,
      resolve: (id) => byId.get(id) ?? null,
    };
  }, [state, retry]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return value;
}
