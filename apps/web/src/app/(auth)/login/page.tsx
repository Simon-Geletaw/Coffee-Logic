'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { login } from '@/lib/api';
import { saveSession } from '@/lib/session';
import { loginSchema, type LoginInput } from '@/lib/validators';

export default function LoginPage() {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      saveSession(session);
      router.replace('/products');
    },
  });

  return (
    <main className="max-w-3xl">
      <section className="panel fade-up grid gap-6 p-6 md:grid-cols-[1.1fr_1fr] md:p-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">Secure Access</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight">Coffee Logic</h1>
        </div>

        <form className="grid gap-3" onSubmit={handleSubmit((values) => loginMutation.mutate(values))}>
          <label className="grid gap-1 text-sm">
            Email
            <input className="field" type="email" placeholder="admin@coffee.logic" {...register('email')} />
            <span className="text-xs text-[color:var(--danger)]">{formState.errors.email?.message}</span>
          </label>

          <label className="grid gap-1 text-sm">
            Password
            <input className="field" type="password" placeholder="Enter your password" {...register('password')} />
            <span className="text-xs text-[color:var(--danger)]">{formState.errors.password?.message}</span>
          </label>

          {loginMutation.error ? (
            <p className="rounded-lg border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 px-3 py-2 text-sm text-[color:var(--danger)]">
              {loginMutation.error instanceof Error ? loginMutation.error.message : 'Login failed'}
            </p>
          ) : null}

          <button type="submit" className="btn btn-primary mt-2" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
