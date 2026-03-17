import { redirect } from 'next/navigation';

export default function DeleteProductsRedirect() {
  redirect('/products');
}
