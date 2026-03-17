import { redirect } from 'next/navigation';

export default function CreateUserRedirect() {
  redirect('/users?new=1');
}
