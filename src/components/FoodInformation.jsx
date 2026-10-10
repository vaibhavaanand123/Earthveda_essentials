import { t, useLanguage } from '../lib/i18n';
const labels = {
  energyKj: ['Energy (kJ)', 'Energie (kJ)'],
  energyKcal: ['Energy (kcal)', 'Energie (kcal)'],
  fat: ['Fat (g)', 'Fett (g)'],
  saturates: ['Saturates (g)', 'Gesättigte Fettsäuren (g)'],
  carbohydrate: ['Carbohydrate (g)', 'Kohlenhydrate (g)'],
  sugars: ['Sugars (g)', 'Zucker (g)'],
  protein: ['Protein (g)', 'Eiweiß (g)'],
  salt: ['Salt (g)', 'Salz (g)'],
};
export default function FoodInformation({ product }) {
  const { language } = useLanguage();
  if (!product.complianceReady)
    return (
      <p className="notice">
        {t(
          'Product information is being finalised. This product is not yet available for purchase.',
          'Die Produktinformationen werden vervollständigt. Dieses Produkt ist noch nicht zum Kauf verfügbar.',
        )}
      </p>
    );
  return (
    <div className="food-info">
      <dl className="info-list">
        <dt>{t('Net quantity', 'Nettofüllmenge')}</dt>
        <dd>{product.netWeightGrams} g</dd>
        <dt>{t('Ingredients', 'Zutaten')}</dt>
        <dd>{product.ingredients[language]}</dd>
        <dt>{t('Allergens', 'Allergene')}</dt>
        <dd>
          <strong>{product.allergens[language]}</strong>
        </dd>
        <dt>{t('Storage', 'Aufbewahrung')}</dt>
        <dd>{product.storage[language]}</dd>
        <dt>{t('Food operator', 'Lebensmittelunternehmer')}</dt>
        <dd>{product.foodOperator}</dd>
        {product.origin && (
          <>
            <dt>{t('Origin', 'Herkunft')}</dt>
            <dd>{product.origin}</dd>
          </>
        )}
      </dl>
      <table className="info-table">
        <caption>{t('Nutrition per 100 g', 'Nährwerte pro 100 g')}</caption>
        <tbody>
          {Object.entries(product.nutrition || {}).map(([key, value]) => (
            <tr key={key}>
              <th scope="row">{t(...labels[key])}</th>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
