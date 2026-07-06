'use client';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body>
        <main>
          <section className="panel p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">Admin</p>
            <h1 className="mt-2 text-2xl font-bold">Unexpected error</h1>
            <p className="mt-2 text-sm text-[color:var(--muted)]">{error.message || 'Something failed while rendering this page.'}</p>
            <button type="button" className="btn btn-primary mt-4" onClick={() => reset()}>
              Retry
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
