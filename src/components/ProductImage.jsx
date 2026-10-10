/** Pack shot. Protein jars are photographed on colour and fill their frame. */
export default function ProductImage({ product, eager = false }) {
  return (
    <img
      className={`pack-img pack-img--${product.range === 'protein' ? 'cover' : 'contain'}`}
      src={product.image}
      alt={`${product.fullName} pack`}
      width="800"
      height="1200"
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
    />
  );
}
