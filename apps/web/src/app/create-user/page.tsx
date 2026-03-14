'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/features/products/constants';
import { AdminShell } from '@/features/ui/admin-shell';
import { AdminSessionGate } from '@/features/auth/components/admin-session-gate';

const ROLE_OPTIONS = ['viewer', 'operator', 'manager', 'admin'] as const;
type Role = (typeof ROLE_OPTIONS)[number];

type CreateUserPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  passwordHash: string;
  role: Role;
  defaultAddress?: string;
};

type ApiCreateUserResponse = {
  status?: number;
  message?: string;
};

const emptyForm: CreateUserPayload = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  passwordHash: '',
  role: 'admin',
  defaultAddress: '',
};

export default function UserPanel() {
  const [form, setForm] = useState<CreateUserPayload>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setErrorMessage('First name and last name are required.');
      return;
    }

    if (!form.phoneNumber.trim()) {
      setErrorMessage('Phone number is required.');
      return;
    }

    if (form.passwordHash.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phoneNumber: form.phoneNumber.trim(),
          defaultAddress: form.defaultAddress?.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as ApiCreateUserResponse;

      if (!response.ok || (payload.status !== undefined && payload.status >= 400)) {
        throw new Error(payload.message || `Failed to create user (${response.status})`);
      }

      setForm(emptyForm);
      setSuccessMessage(payload.message || 'User created successfully.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminSessionGate requiredRole="admin">
      <AdminShell
        currentPath="/create-user"
        title="Users"
        subtitle="Create internal admin users. This page is available only to signed-in administrators."
      >
        <section className="panel fade-up p-6 md:p-7">
        <div className="panel-soft mb-5 p-4">
          <p className="text-sm font-semibold text-slate-900">Admin-only user creation</p>
          <p className="mt-2 text-sm text-slate-600">
            Use this form to create admin users for internal operations.
          </p>
        </div>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-slate-700">
              First Name
              <input
                value={form.firstName}
                onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                className="field"
                placeholder="John"
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              Last Name
              <input
                value={form.lastName}
                onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                className="field"
                placeholder="Doe"
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="field"
                placeholder="john@example.com"
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              Phone Number
              <input
                value={form.phoneNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                className="field"
                placeholder="+90 555 555 55 55"
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              Password
              <div className="flex items-center gap-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  minLength={6}
                  value={form.passwordHash}
                  onChange={(event) => setForm((prev) => ({ ...prev, passwordHash: event.target.value }))}
                  className="field"
                  placeholder="At least 6 characters"
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

            <label className="grid gap-2 text-sm text-slate-700">
              Access Role
              <select
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as Role }))}
                className="field"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role[0].toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-2 text-sm text-slate-700">
            Default Address (optional)
            <textarea
              value={form.defaultAddress ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, defaultAddress: event.target.value }))}
              className="field min-h-20"
              placeholder="Street, city, zip"
            />
          </label>

          {errorMessage && <p className="status-alert">{errorMessage}</p>}
          {successMessage && (
            <div className="status-ok">
              <p>{successMessage}</p>
              <Link href="/" className="mt-3 inline-flex font-semibold text-blue-700 underline underline-offset-4">
                Return to dashboard
              </Link>
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary inline-flex w-fit items-center">
            {submitting ? 'Creating...' : 'Create User'}
          </button>
        </form>
        </section>
      </AdminShell>
    </AdminSessionGate>
  );
}
