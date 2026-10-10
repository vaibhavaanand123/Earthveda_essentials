import { t } from '../lib/i18n';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Price from './Price';
import ProductImage from './ProductImage';
const ROTATE_MS = 7000;

/** Slide copy per range. Products come from the live catalogue. */
const makeSlides = () => [
  {
    range: 'makhana',
    tab: t('Roasted foxnuts', 'Geröstete Foxnuts'),
    eyebrow: t('SNACK WITH GOOD INTENTION', 'SNACKEN MIT GUTEM GEFÜHL'),
    title: [
      t('A little more joy', 'Ein bisschen mehr Freude'),
      t('in every bite.', 'in jedem Bissen.'),
    ],
    lede: t(
      'Discover boldly seasoned foxnuts. Choose your crunch and make your own everyday ritual.',
      'Entdecke würzige Foxnuts. Wähle deinen Lieblingscrunch und mach ihn zu deinem Alltagsritual.',
    ),
    stamp: [t('Choose your', 'Wähle deinen'), t('flavour', 'Geschmack')],
  },
  {
    range: 'protein',
    tab: t('Plant protein', 'Pflanzenprotein'),
    eyebrow: t('A PLANT-BASED POINT OF VIEW', 'EINE PFLANZLICHE PERSPEKTIVE'),
    title: [
      t('Your day,', 'Dein Tag,'),
      t('with a plant-based', 'mit einer pflanzlichen'),
      t('point of view.', 'Perspektive.'),
    ],
    lede: t(
      'Mango, Royal Cream and Chocolate. Mix with water or milk, shake, and enjoy your favourite flavour.',
      'Mango, Royal Cream und Schokolade. Mit Wasser oder Milch mischen, shaken und genießen.',
    ),
    stamp: [t('Shake &', 'Shaken &'), t('enjoy', 'genießen')],
  },
];
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Hero slider: one slide per range. Each slide has its own flavour picker that
 * floods the hero with that pack's colour. Auto-advances, but pauses on hover,
 * keyboard focus, hidden tab, interaction and reduced-motion preference.
 */
export default function HeroSlider({ catalog }) {
  const slides = makeSlides()
    .map((s) => ({
      ...s,
      products: catalog.filter((p) => p.range === s.range),
    }))
    .filter((s) => s.products.length);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState({});
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [held, setHeld] = useState(false); // hover or focus inside
  const [hidden, setHidden] = useState(false);
  const touch = useRef(null);
  const { add } = useCart();
  const count = slides.length;
  const go = useCallback((next) => setIndex((next + count) % count), [count]);
  const running = playing && !held && !hidden && count > 1;
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  useEffect(() => {
    if (!running) return undefined;
    const id = setTimeout(() => go(index + 1), ROTATE_MS);
    return () => clearTimeout(id);
  }, [running, index, go]);
  if (!count) return null;
  const slide = slides[Math.min(index, count - 1)];
  const active = slide.products.find((p) => p.id === picked[slide.range]) || slide.products[0];
  const onKeyDown = (e) => {
    if (e.target.closest('input')) return; // radios use arrows for flavours
    if (e.key === 'ArrowRight') go(index + 1);
    if (e.key === 'ArrowLeft') go(index - 1);
  };
  const onTouchStart = (e) => (touch.current = e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touch.current === null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    touch.current = null;
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
  };
  return (
    <section
      className={`hero hero--${slide.range}`}
      style={{
        '--accent': active.accent,
      }}
      aria-roledescription="carousel"
      aria-label={t('Featured ranges')}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={(e) => e.target.matches(':focus-visible') && setHeld(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHeld(false)}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="container hero__grid"
        key={slide.range}
        role="group"
        aria-roledescription="slide"
        aria-label={`${index + 1} of ${count}: ${slide.tab}`}
        aria-live={running ? 'off' : 'polite'}
      >
        <div className="hero__copy">
          <p className="hero__eyebrow">{slide.eyebrow}</p>
          <h1 className="hero__title">
            {slide.title.map((line, i) => (
              <span className="hero__line" key={i}>
                {line}
              </span>
            ))}
          </h1>
          <p className="hero__lede">{slide.lede}</p>

          <fieldset className="swatches">
            <legend>{t('Pick a flavour')}</legend>
            <div className="swatches__row">
              {slide.products.map((p) => (
                <label
                  key={p.id}
                  className="swatch"
                  style={{
                    '--swatch': p.accent,
                  }}
                >
                  <input
                    type="radio"
                    name={`hero-${slide.range}`}
                    value={p.id}
                    checked={p.id === active.id}
                    onChange={() =>
                      setPicked((s) => ({
                        ...s,
                        [slide.range]: p.id,
                      }))
                    }
                  />
                  <span className="swatch__dot" aria-hidden="true" />
                  <span className="swatch__name">{p.name.replace(' Plant Protein', '')}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <p className="hero__flavour" aria-live="polite">
            {t(active.description, active.descriptionDe || active.description)}
          </p>

          <div className="hero__actions">
            <button
              type="button"
              className="btn btn--light"
              onClick={() => add(active)}
              disabled={!active.available}
            >
              {t('Add')}
              {active.name.replace(' Plant Protein', '')} · <Price product={active} />
            </button>
            <Link className="btn btn--ghost-light" to={`/product/${active.slug}`}>
              {t('Details')}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="hero__stage" aria-hidden="true">
          <div className="hero__arch">
            <ProductImage key={active.id} product={active} eager />
          </div>
          <div className="hero__stamp">
            <span>{slide.stamp[0]}</span>
            <strong>{slide.stamp[1]}</strong>
          </div>
        </div>
      </div>

      {count > 1 && (
        <div className="container hero__controls">
          <div className="hero__tabs" role="group" aria-label={t('Choose slide')}>
            {slides.map((s, i) => (
              <button
                key={s.range}
                type="button"
                className={`hero__tab${i === index ? ' is-on' : ''}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => go(i)}
              >
                <span className="hero__tab-label">{s.tab}</span>
                <span className="hero__tab-bar" aria-hidden="true">
                  <span
                    key={`${index}-${running}`}
                    className={i === index && running ? 'is-running' : i === index ? 'is-full' : ''}
                    style={{
                      animationDuration: `${ROTATE_MS}ms`,
                    }}
                  />
                </span>
              </button>
            ))}
          </div>
          <div className="hero__buttons">
            <button
              type="button"
              className="hero__btn"
              onClick={() => setPlaying((v) => !v)}
              aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
            >
              {playing ? (
                <Pause size={16} aria-hidden="true" />
              ) : (
                <Play size={16} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="hero__btn"
              onClick={() => go(index - 1)}
              aria-label={t('Previous slide')}
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="hero__btn"
              onClick={() => go(index + 1)}
              aria-label={t('Next slide')}
            >
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
