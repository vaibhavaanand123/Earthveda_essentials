import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEFAULT_MARKET, MARKETS, formatMoney, isMarket } from '../../shared/commerce.js';
import { readJson, writeJson } from '../lib/storage';

const MarketContext = createContext(null);
const KEY = 'earthveda-market-v2';

/** First visit: German browser language → Germany, otherwise India. */
function initialMarket() {
  const stored = readJson(KEY, null, isMarket);
  if (stored) return stored;
  return DEFAULT_MARKET;
}

export function MarketProvider({ children }) {
  const [market, setMarket] = useState(initialMarket);
  const selectMarket = useCallback((value) => {
    if (!isMarket(value)) return;
    setMarket(value);
    writeJson(KEY, value);
  }, []);
  const value = useMemo(
    () => ({
      market,
      settings: MARKETS[market],
      selectMarket,
      money: (minor) => formatMoney(minor, market),
    }),
    [market, selectMarket],
  );
  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  const value = useContext(MarketContext);
  if (!value) throw new Error('useMarket must be used inside <MarketProvider>');
  return value;
}
