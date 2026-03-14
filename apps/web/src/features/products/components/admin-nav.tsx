import Link from 'next/link';

type AdminNavProps = {
  currentPath: '/' | '/add-product' | '/manage-products' | '/delete-products' | '/create-user';

};

const links: Array<{ href: AdminNavProps['currentPath']; label: string }> = [
  { href: '/', label: 'Dashboard' },
  { href: '/add-product', label: 'Add Product' },
  { href: '/manage-products', label: 'Manage Products' },
  { href: '/delete-products', label: 'Delete Products' },
  { href: '/create-user', label: 'Users' },
];

export function AdminNav({ currentPath }: AdminNavProps) {
  return (
    <nav className="overflow-x-auto pb-1">
      <div className="flex w-max items-center gap-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
            currentPath === link.href
              ? 'border-blue-300 bg-blue-50 text-blue-800'
              : 'border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700'
          }`}
        >
          {link.label}
        </Link>
      ))}
      </div>
    </nav>
  );
}
