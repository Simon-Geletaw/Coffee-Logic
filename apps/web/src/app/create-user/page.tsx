'use client';

import { FormEvent, useState } from 'react';
import { API_BASE_URL } from '@/features/products/constants';
import { AdminShell } from '@/features/ui/admin-shell';

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
  role: 'viewer',
  defaultAddress: '',
};

export default function UserPanel() {
  const [form, setForm] = useState<CreateUserPayload>(emptyForm);
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
    <AdminShell
      currentPath="/create-user"
      title="Create Team Profile"
      subtitle="Add staff accounts with role-based access in a clean onboarding flow."
    >
      <section className="panel fade-up p-6 md:p-7">
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-slate-200">
              First Name
              <input
                value={form.firstName}
                onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                className="field"
                placeholder="John"
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-200">
              Last Name
              <input
                value={form.lastName}
                onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                className="field"
                placeholder="Doe"
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-200">
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

            <label className="grid gap-2 text-sm text-slate-200">
              Phone Number
              <input
                value={form.phoneNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                className="field"
                placeholder="+90 555 555 55 55"
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-200">
              Password
              <input
                type="password"
                minLength={6}
                value={form.passwordHash}
                onChange={(event) => setForm((prev) => ({ ...prev, passwordHash: event.target.value }))}
                className="field"
                placeholder="At least 6 characters"
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-200">
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

          <label className="grid gap-2 text-sm text-slate-200">
            Default Address (optional)
            <textarea
              value={form.defaultAddress ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, defaultAddress: event.target.value }))}
              className="field min-h-20"
              placeholder="Street, city, zip"
            />
          </label>

          {errorMessage && <p className="status-alert">{errorMessage}</p>}
          {successMessage && <p className="status-ok">{successMessage}</p>}

          <button type="submit" disabled={submitting} className="btn-primary inline-flex w-fit items-center">
            {submitting ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </section>
    </AdminShell>
  );
}
