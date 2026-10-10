import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MARKETS } from '../../shared/commerce.js';
import { priceFor } from '../../shared/catalog.js';
import { config } from '../config';

function setMeta(key, content, attr = 'name') {
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.append(tag);
  }
  tag.setAttribute('content', content);
}

/** Per-route title, description, canonical, Open Graph and Product JSON-LD. */
export default function Seo({ title, description, product, market = 'IN', noindex = false }) {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = title ? `${title} | ${config.appName}` : config.appName;
    setMeta('description', description);
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');
    setMeta('og:title', document.title, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:type', product ? 'product' : 'website', 'property');
    if (config.publicSiteUrl) {
      setMeta('og:url', `${config.publicSiteUrl}${pathname}`, 'property');
      setMeta(
        'og:image',
        `${config.publicSiteUrl}${product?.image || '/images/cream-onion.webp'}`,
        'property',
      );
    }

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (config.publicSiteUrl && !noindex) {
      if (!canonical) {
        canonical = Object.assign(document.createElement('link'), { rel: 'canonical' });
        document.head.append(canonical);
      }
      canonical.href = `${config.publicSiteUrl}${pathname}`;
    } else canonical?.remove();

    document.getElementById('product-jsonld')?.remove();
    const price = priceFor(product, market);
    if (product && price !== null && config.publicSiteUrl) {
      const script = Object.assign(document.createElement('script'), {
        id: 'product-jsonld',
        type: 'application/ld+json',
      });
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.fullName,
        sku: product.sku,
        brand: { '@type': 'Brand', name: 'Earthveda Essentials' },
        description: product.description,
        image: `${config.publicSiteUrl}${product.image}`,
        offers: {
          '@type': 'Offer',
          priceCurrency: MARKETS[market].currency,
          price: (price / 100).toFixed(2),
          availability: product.available
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          url: `${config.publicSiteUrl}${pathname}`,
        },
      });
      document.head.append(script);
    }
  }, [title, description, product, pathname, market, noindex]);
  return null;
}
