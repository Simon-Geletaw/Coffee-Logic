import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main>
      <section className="panel p-6">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">This admin route does not exist.</p>
        <Link href="/" className="btn btn-primary mt-4 inline-flex">
          Go to dashboard
        </Link>
      </section>
    </main>
  );
}
