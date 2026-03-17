import { redirect } from 'next/navigation';

export default function AddProductRedirect() {
  redirect('/products?new=1');
}
