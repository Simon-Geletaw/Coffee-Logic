'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { UserPlus, Trash2, X, Check } from 'lucide-react';
import { useState, useCallback, useRef } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { AuthGuard } from '@/components/auth-guard';
import { TableSkeleton } from '@/components/skeleton';
import { useToast } from '@/components/toast';
import { createUser, deleteUser, getUsers } from '@/lib/api';
import { createUserSchema, type CreateUserInput } from '@/lib/validators';
import { ErrorBoundary } from '@/components/error-boundary';
import type { UserRecord } from '@/lib/types';

/* ─── Delete Button (two-step, same pattern as products) ─────────────── */
type DeleteUserButtonProps = {
  userId: string;
  isPending: boolean;
  onConfirm: (id: string) => void;
};

function DeleteUserButton({ userId, isPending, onConfirm }: DeleteUserButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startConfirm = useCallback(() => {
    setConfirming(true);
    timerRef.current = setTimeout(() => setConfirming(false), 3000);
  }, []);

  const cancel = useCallback(() => {
    setConfirming(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const confirm = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onConfirm(userId);
    setConfirming(false);
  }, [userId, onConfirm]);

  if (confirming) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
        <button
          type="button"
          className="btn btn-danger-solid btn-sm"
          onClick={confirm}
          disabled={isPending}
          id={`confirm-delete-user-${userId}`}
        >
          <Trash2 size={12} />
          Remove
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-icon"
          onClick={cancel}
          aria-label="Cancel"
        >
          <X size={12} />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-danger btn-sm"
      onClick={startConfirm}
      disabled={isPending}
      aria-label="Remove user"
      id={`delete-user-btn-${userId}`}
    >
      <Trash2 size={12} />
      Remove
    </button>
  );
}

/* ─── Role badge ─────────────────────────────────────────────────────── */
const ROLE_BADGE: Record<string, string> = {
  admin: 'badge-accent',
  manager: 'badge-success',
  operator: 'badge-warning',
  viewer: 'badge-muted',
};

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function UsersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const usersQuery = useQuery({ queryKey: ['admin', 'users'], queryFn: getUsers });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      password: '',
      role: 'viewer',
      defaultAddress: '',
    },
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast('success', 'User created', 'The new user account has been added.');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to create user.';
      toast('error', 'Create failed', message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast('success', 'User removed', 'The user account has been deleted.');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to delete user.';
      toast('error', 'Delete failed', message);
    },
  });

  /* Collect first validation error from any field */
  const firstError = Object.values(errors).find((e) => e?.message)?.message;

  return (
    <AuthGuard role="admin">
      <AdminShell title="Users" subtitle="Manage user accounts and access roles.">

        <ErrorBoundary>
          {/* ── Create User Form ── */}
          <section className="panel p-5 fade-up">
            <div className="section-header">
              <div>
                <h2 className="section-title" style={{ fontSize: '0.95rem' }}>Create User</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
                  All fields are required unless marked optional.
                </p>
              </div>
              <UserPlus size={18} style={{ color: 'var(--muted)' }} aria-hidden />
            </div>

            <form
              className="mt-1"
              onSubmit={handleSubmit((values) => createUserMutation.mutate(values))}
              noValidate
            >
              <div className="grid gap-3 md:grid-cols-2">
                {/* Row 1 */}
                <div>
                  <label className="field-label" htmlFor="user-firstName">First Name</label>
                  <input
                    id="user-firstName"
                    className={`field${errors.firstName ? ' field-error' : ''}`}
                    placeholder="e.g. Aisha"
                    autoComplete="given-name"
                    {...register('firstName')}
                  />
                  {errors.firstName ? <p className="form-error">{errors.firstName.message}</p> : null}
                </div>

                <div>
                  <label className="field-label" htmlFor="user-lastName">Last Name</label>
                  <input
                    id="user-lastName"
                    className={`field${errors.lastName ? ' field-error' : ''}`}
                    placeholder="e.g. Tesfaye"
                    autoComplete="family-name"
                    {...register('lastName')}
                  />
                  {errors.lastName ? <p className="form-error">{errors.lastName.message}</p> : null}
                </div>

                {/* Row 2 */}
                <div>
                  <label className="field-label" htmlFor="user-email">Email</label>
                  <input
                    id="user-email"
                    type="email"
                    className={`field${errors.email ? ' field-error' : ''}`}
                    placeholder="user@example.com"
                    autoComplete="email"
                    {...register('email')}
                  />
                  {errors.email ? <p className="form-error">{errors.email.message}</p> : null}
                </div>

                <div>
                  <label className="field-label" htmlFor="user-phone">Phone Number</label>
                  <input
                    id="user-phone"
                    type="tel"
                    className={`field${errors.phoneNumber ? ' field-error' : ''}`}
                    placeholder="+251 900 000 000"
                    autoComplete="tel"
                    {...register('phoneNumber')}
                  />
                  {errors.phoneNumber ? <p className="form-error">{errors.phoneNumber.message}</p> : null}
                </div>

                {/* Row 3 */}
                <div>
                  <label className="field-label" htmlFor="user-password">Password</label>
                  <input
                    id="user-password"
                    type="password"
                    className={`field${errors.password ? ' field-error' : ''}`}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    {...register('password')}
                  />
                  {errors.password ? <p className="form-error">{errors.password.message}</p> : null}
                </div>

                <div>
                  <label className="field-label" htmlFor="user-role">Role</label>
                  <select
                    id="user-role"
                    className={`field${errors.role ? ' field-error' : ''}`}
                    {...register('role')}
                  >
                    <option value="viewer">Viewer — read only</option>
                    <option value="operator">Operator — limited writes</option>
                    <option value="manager">Manager — full access (no admin)</option>
                    <option value="admin">Admin — superuser</option>
                  </select>
                  {errors.role ? <p className="form-error">{errors.role.message}</p> : null}
                </div>

                {/* Row 4 — full width */}
                <div className="md:col-span-2">
                  <label className="field-label" htmlFor="user-address">Default Address <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                  <input
                    id="user-address"
                    className="field"
                    placeholder="Street, City, Country"
                    autoComplete="street-address"
                    {...register('defaultAddress')}
                  />
                </div>

                {/* Submit row */}
                <div className="md:col-span-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {firstError ? (
                    <p className="form-error" role="alert">{firstError}</p>
                  ) : createUserMutation.isError ? (
                    <p className="form-error" role="alert">
                      {createUserMutation.error instanceof Error
                        ? createUserMutation.error.message
                        : 'Something went wrong.'}
                    </p>
                  ) : (
                    <span />
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createUserMutation.isPending}
                    id="create-user-btn"
                  >
                    {createUserMutation.isPending ? (
                      'Adding…'
                    ) : (
                      <>
                        <Check size={14} />
                        Add User
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </section>

          {/* ── Users Table ── */}
          <section className="panel p-5 fade-up mt-5">
            <div className="section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 className="section-title" style={{ fontSize: '0.95rem' }}>All Users</h2>
                {!usersQuery.isPending ? (
                  <span className="badge badge-muted">{usersQuery.data?.length ?? 0}</span>
                ) : null}
              </div>
            </div>

            {usersQuery.isError ? (
              <div
                className="mb-4 rounded-lg px-4 py-3 text-sm"
                style={{
                  background: 'var(--danger-light)',
                  border: '1px solid rgba(183,55,47,0.25)',
                  color: 'var(--danger)',
                }}
                role="alert"
              >
                {usersQuery.error instanceof Error
                  ? usersQuery.error.message
                  : 'Failed to load users. Check your connection.'}
              </div>
            ) : null}

            <div className="table-container">
              {usersQuery.isPending ? (
                <TableSkeleton rows={4} cols={3} hasActions />
              ) : (
                <table className="data-table" aria-label="Users table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(usersQuery.data ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem', fontSize: '0.875rem' }}>
                          No users found. Create your first user above.
                        </td>
                      </tr>
                    ) : (
                      (usersQuery.data ?? []).map((user: UserRecord) => (
                        <tr key={user.id}>
                          <td style={{ fontWeight: 600 }}>
                            {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '—'}
                          </td>
                          <td style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                            {user.email}
                          </td>
                          <td>
                            <span className={`badge ${ROLE_BADGE[user.role ?? ''] ?? 'badge-muted'}`}>
                              {user.role ?? 'n/a'}
                            </span>
                          </td>
                          <td>
                            <DeleteUserButton
                              userId={user.id}
                              isPending={deleteUserMutation.isPending}
                              onConfirm={(id) => deleteUserMutation.mutate(id)}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </ErrorBoundary>
      </AdminShell>
    </AuthGuard>
  );
}
