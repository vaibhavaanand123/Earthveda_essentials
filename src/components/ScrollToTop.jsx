import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scroll to top on page change (not on filter/query changes). */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      requestAnimationFrame(() =>
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'auto' }),
      );
    } else window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
}
