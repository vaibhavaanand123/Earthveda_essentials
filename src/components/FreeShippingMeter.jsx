import { Truck } from 'lucide-react';
import { t } from '../lib/i18n';
export default function FreeShippingMeter() {
  return (
    <div className="ship-meter">
      <p>
        <Truck size={16} />
        {t(
          'Shipping from 4,99 € to 11,99 €. Your final rate appears before payment.',
          'Versand von 4,99 € bis 11,99 €. Dein genauer Betrag wird vor der Zahlung angezeigt.',
        )}
      </p>
    </div>
  );
}
