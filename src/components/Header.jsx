import { useLanguage, t } from '../lib/i18n';
import { Heart, Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useId, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { MARKETS } from '../../shared/commerce.js';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { useMarket } from '../context/MarketContext';
import { useWishlist } from '../context/WishlistContext';
import { useCloseOnNavigate } from '../hooks/useCloseOnNavigate';
import { useDialog } from '../hooks/useDialog';
import AnnouncementBar from './AnnouncementBar';
import Logo from './Logo';
const NAV = [
  {
    to: '/shop?range=makhana',
    label: 'Makhana',
  },
  {
    to: '/shop?range=protein',
    label: 'Plant protein',
  },
  {
    to: '/shop',
    label: 'Shop all',
  },
  {
    to: '/about',
    label: 'Our story',
  },
  {
    to: '/#bundle-quiz',
    label: 'Mix packs',
  },
];

/** NavLink ignores the query string; shop links differ only by ?range, so match it explicitly. */
function NavItem({ item, onClick }) {
  const { pathname, search } = useLocation();
  const [path, query = ''] = item.to.split('?');
  const want = new URLSearchParams(query).get('range');
  const current = new URLSearchParams(search).get('range');
  const active = pathname === path && (path !== '/shop' || want === current);
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={active ? 'active' : undefined}
      aria-current={active ? 'page' : undefined}
    >
      {t(item.label)}
      {item.tag && <em className="nav__tag">{item.tag}</em>}
    </Link>
  );
}
function MarketSelect({ id }) {
  const { market, selectMarket } = useMarket();
  return (
    <label className="market" htmlFor={id}>
      <span className="sr-only">{t('Delivery country')}</span>
      <select id={id} value={market} onChange={(e) => selectMarket(e.target.value)}>
        {Object.values(MARKETS).map((m) => (
          <option key={m.code} value={m.code}>
            {t(m.name)} · {m.currency}
          </option>
        ))}
      </select>
    </label>
  );
}
function SearchBar({ onDone }) {
  const [query, setQuery] = useState('');
  const { catalog } = useCatalog();
  const navigate = useNavigate();
  const q = query.trim().toLowerCase();
  const suggestions =
    q.length > 1
      ? catalog.filter((p) => `${p.fullName} ${p.category}`.toLowerCase().includes(q)).slice(0, 5)
      : [];
  const submit = (event) => {
    event.preventDefault();
    if (!q) return;
    navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
    onDone();
  };
  return (
    <div className="searchbar">
      <form role="search" onSubmit={submit} className="container">
        <Search size={20} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('Search flavours: peri peri, mango, cheese')}
          aria-label={t('Search products')}
          autoFocus
          enterKeyHint="search"
        />
        <button type="button" className="icon-btn" onClick={onDone} aria-label={t('Close search')}>
          <X aria-hidden="true" />
        </button>
      </form>
      {suggestions.length > 0 && (
        <ul className="container searchbar__hits" aria-label={t('Suggestions')}>
          {suggestions.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  navigate(`/product/${p.slug}`);
                  onDone();
                }}
              >
                <span
                  className="dot"
                  style={{
                    background: p.accent,
                  }}
                  aria-hidden="true"
                />
                {p.fullName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export default function Header() {
  const { language, setLanguage } = useLanguage();
  const cart = useCart();
  const wishlist = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useDialog(menuOpen, () => setMenuOpen(false));
  const marketId = useId();
  const mobileMarketId = useId();
  useCloseOnNavigate(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  });
  return (
    <>
      <a className="skip-link" href="#main">
        {t('Skip to content')}
      </a>
      <AnnouncementBar />
      <header className="header">
        <div className="container header__row">
          <button
            type="button"
            className="icon-btn only-mobile"
            onClick={() => setMenuOpen(true)}
            aria-label={t('Open menu')}
            aria-expanded={menuOpen}
          >
            <Menu aria-hidden="true" />
          </button>
          <Logo />
          <nav className="nav only-desktop" aria-label={t('Main')}>
            {NAV.map((item) => (
              <NavItem key={item.to} item={item} />
            ))}
          </nav>
          <div className="header__actions">
            <div className="language-toggle" role="group" aria-label={t('Language / Sprache')}>
              {['de', 'en'].map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={language === code}
                  onClick={() => setLanguage(code)}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
            <span className="only-desktop">
              <MarketSelect id={marketId} />
            </span>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label={t('Search')}
              aria-expanded={searchOpen}
            >
              <Search aria-hidden="true" />
            </button>
            <NavLink
              className="icon-btn only-desktop badge-host"
              to="/wishlist"
              aria-label={`Wishlist, ${wishlist.ids.length} saved`}
            >
              <Heart aria-hidden="true" />
              {wishlist.ids.length > 0 && <span className="badge">{wishlist.ids.length}</span>}
            </NavLink>
            <button
              type="button"
              className="icon-btn badge-host"
              onClick={cart.openDrawer}
              aria-label={`Open bag, ${cart.count} items`}
            >
              <ShoppingBag aria-hidden="true" />
              {cart.count > 0 && <span className="badge">{cart.count}</span>}
            </button>
          </div>
        </div>
        {searchOpen && <SearchBar onDone={() => setSearchOpen(false)} />}
      </header>

      {menuOpen && (
        <div
          className="overlay overlay--left"
          onClick={() => setMenuOpen(false)}
          role="presentation"
        >
          <nav
            ref={menuRef}
            className="drawer drawer--left"
            role="dialog"
            aria-modal="true"
            aria-label={t('Menu')}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer__head">
              <Logo onClick={() => setMenuOpen(false)} />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setMenuOpen(false)}
                aria-label={t('Close menu')}
                data-autofocus
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="mobile-nav">
              {NAV.map((item) => (
                <NavItem key={item.to} item={item} />
              ))}
              <NavLink to="/wishlist">
                {t('Wishlist (')}
                {wishlist.ids.length})
              </NavLink>
              <NavLink to="/track">{t('Track an order')}</NavLink>
              <NavLink to="/faq">{t('FAQs')}</NavLink>
              <NavLink to="/contact">{t('Contact')}</NavLink>
            </div>
            <div className="mobile-nav__market">
              <span>{t('Delivering to')}</span>
              <MarketSelect id={mobileMarketId} />
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
