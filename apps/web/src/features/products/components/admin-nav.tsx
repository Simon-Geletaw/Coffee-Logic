import Link from 'next/link';

type AdminNavProps = {
  currentPath: '/' | '/add-product' | '/manage-products' | '/delete-products' | '/create-user';

};

const links: Array<{ href: AdminNavProps['currentPath']; label: string }> = [
  { href: '/', label: 'Overview' },
  { href: '/add-product', label: 'New Product' },
  { href: '/manage-products', label: 'Catalog Editor' },
  { href: '/delete-products', label: 'Archive Product' },
  { href: '/create-user', label: 'Team Access' },
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
              ? 'border-cyan-200/60 bg-cyan-200/20 text-cyan-100'
              : 'border-slate-600/50 bg-slate-900/70 text-slate-200 hover:border-cyan-300/50 hover:text-cyan-100'
          }`}
        >
          {link.label}
        </Link>
      ))}
      </div>
    </nav>
  );
}
