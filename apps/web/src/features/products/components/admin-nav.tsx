import Link from 'next/link';

type AdminNavProps = {
  currentPath: '/' | '/add-product' | '/manage-products' | '/delete-products';

};

const links: Array<{ href: AdminNavProps['currentPath']; label: string }> = [
  { href: '/', label: 'Dashboard' },
  { href: '/add-product', label: 'Add Product' },
  { href: '/manage-products', label: 'Manage Products' },
  { href: '/delete-products', label: 'Delete Products' },
];

export function AdminNav({ currentPath }: AdminNavProps) {
  return (
    <div className="flex items-center gap-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-lg border px-3 py-2 text-sm transition ${
            currentPath === link.href
              ? 'border-slate-500 bg-slate-800 text-white'
              : 'border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
