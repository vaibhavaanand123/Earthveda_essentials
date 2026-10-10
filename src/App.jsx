import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import CartDrawer from './components/CartDrawer';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './components/Footer';
import Header from './components/Header';
import ScrollToTop from './components/ScrollToTop';
import WhatsAppButton from './components/WhatsAppButton';
import { CartProvider } from './context/CartContext';
import { CatalogProvider } from './context/CatalogContext';
import { MarketProvider } from './context/MarketContext';
import { WishlistProvider } from './context/WishlistContext';
import Home from './pages/Home';
import { useLanguage } from './lib/i18n';
import { useEffect } from 'react';
const PaymentReturn = lazy(() => import('./pages/PaymentReturn'));
const Withdrawal = lazy(() => import('./pages/Withdrawal'));
const Subscription = lazy(() => import('./pages/Subscription'));

// Home ships in the main bundle for the fastest first paint; everything else is split.
const Shop = lazy(() => import('./pages/Shop'));
const Product = lazy(() => import('./pages/Product'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const Track = lazy(() => import('./pages/Track'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Info = lazy(() => import('./pages/Info'));
const Admin = lazy(() => import('./pages/Admin'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageFallback() {
  return (
    <main className="page container" aria-busy="true" aria-label="Loading">
      <div className="skeleton skeleton--hero" />
    </main>
  );
}

function AppRoutes() {
  const { language } = useLanguage();
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');
  return (
    <>
      <ScrollToTop />
      {!isAdmin && <Header />}
      <div id="main" tabIndex={-1} key={pathname}>
        <ErrorBoundary>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/search" element={<Shop />} />
              <Route path="/product/:slug" element={<Product />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/payment-return" element={<PaymentReturn />} />
              <Route path="/withdraw" element={<Withdrawal />} />
              <Route path="/newsletter-confirm" element={<Subscription />} />
              <Route path="/unsubscribe" element={<Subscription />} />
              <Route path="/order/:orderNumber" element={<OrderConfirmation />} />
              <Route path="/track" element={<Track />} />
              <Route path="/track/:orderNumber" element={<Track />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/:page" element={<Info />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      {!isAdmin && (
        <>
          <Footer />
          <CartDrawer />
          <WhatsAppButton />
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <MarketProvider>
          <CatalogProvider>
            <WishlistProvider>
              <CartProvider>
                <AppRoutes />
              </CartProvider>
            </WishlistProvider>
          </CatalogProvider>
        </MarketProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
