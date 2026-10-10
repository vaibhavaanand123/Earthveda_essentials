import ProductCard from './ProductCard';

export default function ProductGrid({ products, eagerCount = 0, variant = 'grid', label }) {
  return (
    <div className={`product-grid product-grid--${variant}`} role="list" aria-label={label}>
      {products.map((product, i) => (
        <div role="listitem" key={product.id}>
          <ProductCard product={product} eager={i < eagerCount} />
        </div>
      ))}
    </div>
  );
}
