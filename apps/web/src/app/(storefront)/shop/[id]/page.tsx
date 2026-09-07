import ProductClient from './product-client';

export const metadata = { title: 'Coffee — Melkora' };

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductClient productId={id} />;
}
