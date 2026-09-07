import OrderClient from './order-client';

export const metadata = { title: 'Order — Melkora' };

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderClient orderId={id} />;
}
