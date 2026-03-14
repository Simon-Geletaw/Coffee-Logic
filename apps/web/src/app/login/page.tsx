'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdmin } from '@/features/auth/api';
import { saveAuthSession } from '@/features/auth/storage';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Email and password are required.');
      return;
    }

    setSubmitting(true);

    try {
      const session = await loginAdmin({ email: email.trim(), password });
      saveAuthSession(session);
      router.push('/');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="app-shell">
      <div className="page-wrap grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <section className="panel fade-up p-6 md:p-7">
          <span className="chip">Admin access</span>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900 md:text-4xl">Admin</h1>
        </section>

        <section className="panel fade-up p-6 md:p-7">
          <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">Login</h2>

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm text-slate-700">
              Email address
              <input
                type="email"
                className="field"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="manager@coffeelogic.com"
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              Password
              <div className="flex items-center gap-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="field"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center justify-center px-3 py-2 text-xs font-semibold"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            {errorMessage && <p className="status-alert">{errorMessage}</p>}

            <button type="submit" disabled={submitting} className="btn-primary inline-flex items-center justify-center">
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
