import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import { priceFor } from '../../shared/catalog.js';
import { cartReducer, isQuantityMap, summariseCart } from '../lib/cart.js';
import { readJson, writeJson } from '../lib/storage';
import { analyticsService } from '../services/analyticsService';
import { useCatalog } from './CatalogContext';
import { useMarket } from './MarketContext';

const CartContext = createContext(null);
const KEY = 'earthveda-cart-v2';

export function CartProvider({ children }) {
  const { resolve, loading, error, settings } = useCatalog();
  const { market } = useMarket();
  const [quantities, dispatch] = useReducer(cartReducer, undefined, () =>
    readJson(KEY, {}, isQuantityMap),
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => writeJson(KEY, quantities), [quantities]);

  const add = useCallback(
    (product, amount = 1, { openDrawer = true } = {}) => {
      if (!product?.available || priceFor(product, market) === null) return false;
      dispatch({ type: 'add', id: product.id, amount });
      analyticsService.track('add_to_cart', { item_id: product.sku, quantity: amount, market });
      if (openDrawer) setDrawerOpen(true);
      return true;
    },
    [market],
  );
  const addBundle = useCallback(
    (products, perFlavour) => {
      if (
        products.length !== 4 ||
        new Set(products.map((p) => p.id)).size !== 4 ||
        ![2, 4].includes(perFlavour) ||
        products.some(
          (p) =>
            !p.available ||
            priceFor(p, market) !== 299 ||
            (quantities[p.id] || 0) + perFlavour > 40,
        )
      )
        return false;
      dispatch({ type: 'bundle', products, perFlavour });
      setDrawerOpen(true);
      return true;
    },
    [market, quantities],
  );
  const setQuantity = useCallback((id, quantity) => dispatch({ type: 'set', id, quantity }), []);
  const remove = useCallback((id) => dispatch({ type: 'set', id, quantity: 0 }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);

  const summary = useMemo(
    () => summariseCart(quantities, market, resolve, settings.shipping),
    [quantities, market, resolve, settings.shipping],
  );

  const value = useMemo(
    () => ({
      ...summary,
      ready: !loading && !error,
      quantityOf: (id) => quantities[id] || 0,
      add,
      addBundle,
      setQuantity,
      remove,
      clear,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
    }),
    [summary, loading, error, quantities, add, addBundle, setQuantity, remove, clear, drawerOpen],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside <CartProvider>');
  return value;
}
