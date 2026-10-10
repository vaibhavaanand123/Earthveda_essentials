import { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';
import { useCart } from '../context/CartContext';
import { useMarket } from '../context/MarketContext';
import { t } from '../lib/i18n';
import { priceFor } from '../../shared/catalog';
export default function BundleQuiz() {
  const { catalog } = useCatalog();
  const { addBundle } = useCart();
  const { market, money } = useMarket();
  const [mood, setMood] = useState('all');
  const [selected, setSelected] = useState([]);
  const [size, setSize] = useState(8);
  const [message, setMessage] = useState('');
  const choices = catalog.filter((p) => priceFor(p, market) === 299);
  const displayed = choices.filter(
    (p) => mood === 'all' || (mood === 'sweet' ? p.range === 'protein' : p.range === 'makhana'),
  );
  const toggle = (id) => {
    setMessage('');
    setSelected((old) =>
      old.includes(id) ? old.filter((x) => x !== id) : old.length < 4 ? [...old, id] : old,
    );
  };
  const complete = selected.length === 4;
  const bundle = selected.map((id) => catalog.find((p) => p.id === id)).filter(Boolean);
  return (
    <section id="bundle-quiz" className="bundle-quiz">
      <div className="container">
        <div className="bundle-quiz__head">
          <p className="eyebrow">{t('YOUR FLAVOURS. YOUR RULES.', 'DEINE SORTEN. DEIN PAKET.')}</p>
          <h2>{t('Choose your flavours.', 'Wähle deine Lieblingssorten.')}</h2>
          <p>
            {t(
              'A little quiz. A bundle that feels like you.',
              'Ein kleines Quiz. Ein Paket ganz nach deinem Geschmack.',
            )}
          </p>
        </div>
        <fieldset className="quiz-mood">
          <legend>{t('1. What are you in the mood for?', '1. Worauf hast du Lust?')}</legend>
          {[
            ['all', t('A little of everything', 'Von allem etwas')],
            ['savoury', t('A savoury crunch', 'Herzhafter Crunch')],
            ['sweet', t('Something sweet', 'Etwas Süßes')],
          ].map(([value, label]) => (
            <label key={value} className={mood === value ? 'is-on' : ''}>
              <input
                type="radio"
                name="mood"
                checked={mood === value}
                onChange={() => setMood(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>
            {t('2. Pick four flavours', '2. Wähle vier Sorten')} <small>{selected.length}/4</small>
          </legend>
          <p>
            {t(
              'You can combine both ranges. Change the mood filter to explore more.',
              'Du kannst beide Produktreihen kombinieren. Ändere den Filter, um mehr zu entdecken.',
            )}
          </p>
          <div className="quiz-grid">
            {displayed.map((p) => (
              <button
                type="button"
                key={p.id}
                aria-pressed={selected.includes(p.id)}
                className={`quiz-card ${selected.includes(p.id) ? 'is-on' : ''}`}
                style={{ '--accent': p.accent }}
                onClick={() => toggle(p.id)}
                disabled={!p.available || (!selected.includes(p.id) && selected.length === 4)}
              >
                <img src={p.image} alt="" loading="lazy" width="150" height="180" />
                <strong>{p.name}</strong>
                <span>{selected.includes(p.id) ? <Check size={18} /> : money(299)}</span>
              </button>
            ))}
          </div>
          <p className="quiz-selected">
            {t('Your selection:', 'Deine Auswahl:')}{' '}
            {bundle.map((p) => p.name).join(' · ') ||
              t('Choose a flavour to begin', 'Wähle die erste Sorte')}
          </p>
        </fieldset>
        <div className="quiz-finish">
          <fieldset>
            <legend>{t('3. Make it your size', '3. Wähle deine Paketgröße')}</legend>
            {[8, 16].map((n) => (
              <label key={n} className={size === n ? 'is-on' : ''}>
                <input
                  type="radio"
                  name="bundle-size"
                  checked={size === n}
                  onChange={() => setSize(n)}
                />
                <strong>
                  {n} {t('packs', 'Packungen')}
                </strong>{' '}
                <span>
                  {money(n * 299)} · {n / 4} {t('of each flavour', 'je Sorte')}
                </span>
              </label>
            ))}
          </fieldset>
          <div>
            <button
              className="btn btn--light"
              disabled={!complete}
              onClick={() =>
                setMessage(
                  addBundle(bundle, size / 4)
                    ? t('Your bundle is in your bag.', 'Dein Paket liegt im Warenkorb.')
                    : t(
                        'A flavour is unavailable or the quantity limit was reached.',
                        'Eine Sorte ist nicht verfügbar oder die Mengenbegrenzung ist erreicht.',
                      ),
                )
              }
            >
              {t('Add my bundle', 'Mein Paket hinzufügen')} <ArrowRight size={18} />
            </button>
            <p>
              {t(
                'Plus shipping, calculated at checkout.',
                'Zuzüglich Versand, berechnet an der Kasse.',
              )}
            </p>
            <p role="status">{message}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
