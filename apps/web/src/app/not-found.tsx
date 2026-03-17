import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="app-shell">
      <div className="page-wrap">
        <section className="panel fade-up p-6 md:p-7">
          <span className="chip">Admin</span>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900 md:text-3xl">Page not found</h1>
          <p className="mt-3 text-sm text-slate-600">The page you are looking for does not exist.</p>
          <div className="mt-5">
            <Link href="/" className="btn-primary inline-flex items-center">
              Go to dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

