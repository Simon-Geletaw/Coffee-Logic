'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AdminSessionGate } from '@/features/auth/components/admin-session-gate';
import { createUser, getUsers, type CreateUserPayload, type UserListItem } from '@/features/users/api';
import { downloadCsv } from '@/features/utils/csv';
import { AdminLayout } from '@/features/ui/admin-layout';
import { DataTable } from '@/features/ui/data-table';
import { Drawer } from '@/features/ui/drawer';
import { IconDownload, IconPlus, IconSearch } from '@/features/ui/icons';
import { useToast } from '@/features/ui/toast';

const ROLE_OPTIONS = ['viewer', 'operator', 'manager', 'admin'] as const;
type Role = (typeof ROLE_OPTIONS)[number];

const emptyForm: CreateUserPayload = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  passwordHash: '',
  role: 'viewer',
  defaultAddress: '',
};

const strongPasswordChecklist = (password: string) => {
  const checks = [
    { ok: password.length >= 8, label: 'At least 8 characters' },
    { ok: /[a-z]/.test(password), label: 'One lowercase letter' },
    { ok: /[A-Z]/.test(password), label: 'One uppercase letter' },
    { ok: /[0-9]/.test(password), label: 'One number' },
    { ok: /[^A-Za-z0-9]/.test(password), label: 'One symbol' },
  ];
  return checks;
};

export default function UsersPage() {
  const { pushToast } = useToast();

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<CreateUserPayload>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const passwordChecks = useMemo(() => strongPasswordChecklist(form.passwordHash), [form.passwordHash]);
  const passwordOk = passwordChecks.every((check) => check.ok);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      return (
        user.email.toLowerCase().includes(q) ||
        user.firstName.toLowerCase().includes(q) ||
        user.lastName.toLowerCase().includes(q)
      );
    });
  }, [query, users]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setUsers([]);
      setError(err instanceof Error ? err.message : 'Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === '1') {
      setDrawerOpen(true);
    }
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setFormError('');
    setDrawerOpen(true);
  };

  const exportCsv = () => {
    const filename = `users_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, ['email', 'firstName', 'lastName'], filtered.map((u) => [u.email, u.firstName, u.lastName]));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError('First name and last name are required.');
      return;
    }
    if (!form.email.trim()) {
      setFormError('Email is required.');
      return;
    }
    if (!form.phoneNumber.trim()) {
      setFormError('Phone number is required.');
      return;
    }
    if (!passwordOk) {
      setFormError('Password does not meet strength requirements.');
      return;
    }

    setBusy(true);
    try {
      const result = await createUser({
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        passwordHash: form.passwordHash,
        role: form.role as Role,
        defaultAddress: form.defaultAddress?.trim() || undefined,
      });
      pushToast({ kind: 'success', title: 'User created', message: result.message });
      setDrawerOpen(false);
      await fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create user.');
    } finally {
      setBusy(false);
    }
  };

  const actions = (
    <>
      <button type="button" className="btn-secondary inline-flex items-center gap-2 px-4 py-2" onClick={exportCsv}>
        <IconDownload className="h-4 w-4" />
        Export CSV
      </button>
      <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={openCreate}>
        <IconPlus className="h-4 w-4" />
        New user
      </button>
    </>
  );

  const searchSlot = (
    <div className="panel-soft p-4">
      <label className="grid gap-2 text-sm text-slate-700">
        <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Search</span>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <IconSearch className="h-4 w-4" />
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="field pl-10"
            placeholder="Search by name or email"
          />
        </div>
      </label>
    </div>
  );

  const emptyState = (
    <div className="grid gap-2 text-center text-sm text-slate-600">
      <p className="font-semibold text-slate-900">{query.trim() ? 'No matches' : 'No users found'}</p>
      <p>{query.trim() ? 'Try a different search term.' : 'Create the first user to get started.'}</p>
      {!query.trim() ? (
        <div className="mt-2 flex justify-center">
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={openCreate}>
            <IconPlus className="h-4 w-4" />
            New user
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <AdminSessionGate requiredRole="admin">
      <AdminLayout title="Users" subtitle="Manage staff accounts and access." actions={actions} searchSlot={searchSlot}>
        {error ? (
          <section className="status-alert">
            <p className="font-semibold">Failed to load users</p>
            <p className="mt-1">{error}</p>
            <div className="mt-4">
              <button type="button" className="btn-secondary px-4 py-2" onClick={fetchUsers}>
                Retry
              </button>
            </div>
          </section>
        ) : null}

        <section className="panel fade-up p-5 md:p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">User list</h2>
            <p className="mt-1 text-sm text-slate-600">
              {loading ? 'Loading…' : `${filtered.length} user${filtered.length === 1 ? '' : 's'} shown`}
            </p>
          </div>

          <DataTable
            loading={loading}
            empty={!loading && !error && filtered.length === 0 ? emptyState : undefined}
            colCount={3}
            header={
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Email</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">First name</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Last name</th>
                </tr>
              </thead>
            }
          >
            {filtered.map((user) => (
              <tr key={user.email} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-900">{user.email}</td>
                <td className="px-4 py-3 text-slate-700">{user.firstName}</td>
                <td className="px-4 py-3 text-slate-700">{user.lastName}</td>
              </tr>
            ))}
          </DataTable>
        </section>

        <Drawer
          open={drawerOpen}
          title="New user"
          description="Creates a staff account. Password must include upper/lowercase, number, and symbol."
          onClose={() => setDrawerOpen(false)}
          footer={
            <div className="flex items-center justify-between gap-3">
              {formError ? <p className="text-sm font-semibold text-rose-700">{formError}</p> : <span />}
              <button type="submit" form="create-user-form" className="btn-primary" disabled={busy}>
                {busy ? 'Creating…' : 'Create user'}
              </button>
            </div>
          }
        >
          <form id="create-user-form" className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-slate-700">
                First name
                <input
                  value={form.firstName}
                  onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                  className="field"
                  placeholder="John"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                Last name
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
                Phone number
                <input
                  value={form.phoneNumber}
                  onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                  className="field"
                  placeholder="+90 555 555 55 55"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm text-slate-700 md:col-span-2">
                Password
                <div className="flex items-center gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.passwordHash}
                    onChange={(event) => setForm((prev) => ({ ...prev, passwordHash: event.target.value }))}
                    className="field"
                    placeholder="Strong password"
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
                <div className="mt-2 grid gap-1 text-xs text-slate-600 md:grid-cols-2">
                  {passwordChecks.map((check) => (
                    <p key={check.label} className={check.ok ? 'text-emerald-700' : ''}>
                      {check.ok ? 'OK' : 'Missing'}: {check.label}
                    </p>
                  ))}
                </div>
              </label>

              <label className="grid gap-2 text-sm text-slate-700">
                Role
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
              Default address (optional)
              <textarea
                value={form.defaultAddress ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, defaultAddress: event.target.value }))}
                className="field min-h-24"
                placeholder="Street, city, zip"
              />
            </label>
          </form>
        </Drawer>
      </AdminLayout>
    </AdminSessionGate>
  );
}
