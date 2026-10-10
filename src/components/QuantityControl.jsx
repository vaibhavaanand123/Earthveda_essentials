import { t } from '../lib/i18n';
import { Minus, Plus } from 'lucide-react';
import { ORDER_LIMITS } from '../../shared/commerce.js';
export default function QuantityControl({
  value,
  onChange,
  label = 'Quantity',
  min = 1,
  size = 'md',
}) {
  const max = ORDER_LIMITS.maxQuantityPerLine;
  return (
    <div className={`qty qty--${size}`} role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={t('Decrease quantity')}
      >
        <Minus size={16} aria-hidden="true" />
      </button>
      <output aria-live="polite">{value}</output>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={t('Increase quantity')}
      >
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
