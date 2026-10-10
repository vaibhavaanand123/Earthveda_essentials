/**
 * Earthveda Essentials product catalogue. the single source of truth for the
 * storefront and the order API.
 *
 * BEFORE LAUNCH the merchant must confirm every value flagged in README.md →
 * "Launch checklist": prices, net weights, ingredient/allergen data and any
 * claim printed in `highlights`. Prices are integer minor units (paise/cents).
 * A `null` price means "not sold in that market".
 */

export const RANGES = Object.freeze({
  makhana: {
    id: 'makhana',
    label: 'Roasted makhana',
    short: 'Makhana',
    tagline: 'Light, airy foxnuts with bold seasoning.',
  },
  protein: {
    id: 'protein',
    label: 'Plant protein',
    short: 'Protein',
    tagline: 'Roasted chickpea drinks, shaken in seconds.',
  },
});

export const MOMENTS = Object.freeze({
  desk: { id: 'desk', label: 'Desk-drawer crunch', note: 'For the 4 pm slump between calls.' },
  workout: { id: 'workout', label: 'After a workout', note: 'Plant protein for the walk home.' },
  chai: { id: 'chai', label: 'Chai-time', note: 'Something savoury next to the cup.' },
  travel: { id: 'travel', label: 'On the go', note: 'Resealable, bag-friendly, spill-free.' },
});

const makhana = ({ id, code, name, accent, description, moments, image = id }) => ({
  id,
  slug: `${id}-makhana`,
  sku: `EV-MKH-${code}`,
  range: 'makhana',
  category: RANGES.makhana.label,
  name,
  fullName: `Roasted Foxnuts (Makhana). ${name}`,
  description,
  image: `/images/${image}.webp`,
  accent,
  netWeightGrams: null,
  sizeLabel: 'Pouch · net weight on pack',
  featured: true,
  isNew: false,
  available: true,
  published: true,
  complianceReady: false,
  stock: 0,
  ingredients: { de: '', en: '' },
  allergens: { de: '', en: '' },
  nutrition: null,
  foodOperator: '',
  storage: { de: '', en: '' },
  origin: '',
  taxRates: { DE: null, GB: null },
  moments,
  highlights: ['Roasted, not fried', 'Flavourful crunch'],
  howToEnjoy: 'Best with chai, in a movie bowl, or as a lighter swap for chips.',
  prices: { DE: 299, GB: 299 },
});

const protein = ({ id, code, name, accent, description }) => ({
  id: `protein-${id}`,
  slug: `${id}-plant-protein`,
  sku: `EV-PRO-${code}`,
  range: 'protein',
  category: RANGES.protein.label,
  name: `${name} Plant Protein`,
  fullName: `Roasted Chickpea Plant-Based Protein. ${name}`,
  description,
  image: `/images/protein-${id}.webp`,
  accent,
  netWeightGrams: null,
  sizeLabel: 'Jar · net weight on pack',
  featured: false,
  isNew: false,
  available: true,
  published: true,
  complianceReady: false,
  stock: 0,
  ingredients: { de: '', en: '' },
  allergens: { de: '', en: '' },
  nutrition: null,
  foodOperator: '',
  storage: { de: '', en: '' },
  origin: '',
  taxRates: { DE: null, GB: null },
  moments: ['workout'],
  highlights: ['Mango, Royal Cream & Chocolate', 'Mix with water or milk'],
  howToEnjoy: 'Shake with cold water or milk of your choice. See the jar for serving size.',
  prices: { DE: 299, GB: 299 },
});

export const products = Object.freeze([
  makhana({
    id: 'cream-onion',
    code: 'CRON',
    name: 'Cream & Onion',
    accent: '#2f6b35',
    moments: ['chai', 'desk'],
    description:
      'Classic, rich and savoury. a creamy onion seasoning on light, crisp roasted foxnuts.',
  }),
  makhana({
    id: 'peri-peri',
    code: 'PERI',
    name: 'Peri Peri',
    accent: '#b3282b',
    moments: ['desk', 'travel'],
    description: 'Spicy, bold and exciting. Crisp roasted foxnuts with a lively peri peri kick.',
  }),
  makhana({
    id: 'asian-pepper-garlic',
    code: 'APGR',
    name: 'Asian Pepper & Garlic',
    accent: '#c7302f',
    moments: ['chai', 'desk'],
    description: 'Cracked pepper and garlic on light, airy foxnuts, roasted in olive oil.',
  }),
  makhana({
    id: 'pink-salt-pepper',
    code: 'PSBP',
    name: 'Himalayan Salt & Pepper',
    accent: '#26272b',
    moments: ['desk', 'travel', 'workout'],
    description: 'Simple, clean and pure. Himalayan pink salt and black pepper on roasted foxnuts.',
  }),
  makhana({
    id: 'cheese-herbs',
    code: 'CHHB',
    name: 'Cheese & Herbs',
    accent: '#7c76c4',
    moments: ['chai', 'travel'],
    description: 'Cheese and fresh herbs on crunchy foxnuts, roasted in olive oil.',
  }),
  makhana({
    id: 'four-cheese',
    code: '4CHZ',
    name: 'Four Cheese',
    accent: '#2a3fb0',
    moments: ['chai', 'desk'],
    description: 'A rich four-cheese seasoning on roasted foxnuts, roasted in olive oil.',
  }),
  makhana({
    id: 'butter-chicken',
    code: 'BTCK',
    name: 'Butter Chicken',
    accent: '#c7662e',
    moments: ['chai', 'travel'],
    description:
      'Buttery, warmly spiced and comforting. butter chicken flavour on foxnuts roasted in olive oil.',
  }),
  protein({
    id: 'mango',
    code: 'MNGO',
    name: 'Mango',
    accent: '#e9a52c',
    description:
      'Roasted chickpea blended with mango flavour. A sunny, plant-based shake for after the gym.',
  }),
  protein({
    id: 'royal-cream',
    code: 'RYCR',
    name: 'Royal Cream',
    accent: '#a0825a',
    description: 'Roasted chickpea with a rich, creamy, nutty profile. Mix it cold, sip it slow.',
  }),
  protein({
    id: 'chocolate',
    code: 'CHOC',
    name: 'Chocolate',
    accent: '#5a3322',
    description: 'Roasted chickpea with cocoa. A chocolate shake that happens to be plant-based.',
  }),
]);

const byId = new Map(products.map((p) => [p.id, p]));
const bySlug = new Map(products.map((p) => [p.slug, p]));

export const findProduct = (id) => byId.get(id) ?? null;
export const findProductBySlug = (slug) => bySlug.get(slug) ?? null;

/** Price in minor units for a market, or null when not sold there. */
export function priceFor(product, market) {
  const value = product?.prices?.[market];
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/** Price per kg (minor units). required on German listings (PAngV). */
export function unitPricePerKg(product, market) {
  const price = priceFor(product, market);
  if (price === null || !product?.netWeightGrams) return null;
  return Math.round((price * 1000) / product.netWeightGrams);
}
