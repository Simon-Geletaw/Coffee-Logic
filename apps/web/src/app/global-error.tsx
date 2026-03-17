'use client';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="antialiased">
        <main className="app-shell">
          <div className="page-wrap">
            <section className="panel p-6 md:p-7">
              <span className="chip">Admin</span>
              <h1 className="mt-4 text-2xl font-semibold text-slate-900 md:text-3xl">Something went wrong</h1>
              <p className="mt-3 text-sm text-slate-600">
                An unexpected error occurred while rendering this page.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button type="button" className="btn-primary" onClick={() => reset()}>
                  Try again
                </button>
                <a className="btn-secondary inline-flex items-center px-4 py-2" href="/login">
                  Go to login
                </a>
              </div>
              {error?.message ? (
                <pre className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                  {error.message}
                </pre>
              ) : null}
            </section>
          </div>
        </main>
      </body>
    </html>
  );
}

