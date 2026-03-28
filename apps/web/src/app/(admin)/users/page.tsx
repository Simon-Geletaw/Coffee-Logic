'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AdminShell } from '@/components/admin-shell';
import { AuthGuard } from '@/components/auth-guard';
import { createUser, deleteUser, getUsers } from '@/lib/api';
import { createUserSchema, type CreateUserInput } from '@/lib/validators';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const { register, handleSubmit, reset, formState } = useForm<CreateUserInput>({
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
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return (
    <AuthGuard role="admin">
      <AdminShell title="Users" subtitle="Add and remove users using built-in admin API endpoints.">
        <section className="panel p-5">
          <h3 className="text-lg font-semibold">Create User</h3>
          <form className="mt-3 grid gap-2 md:grid-cols-2" onSubmit={handleSubmit((values) => createUserMutation.mutate(values))}>
            <input className="field" placeholder="First name" {...register('firstName')} />
            <input className="field" placeholder="Last name" {...register('lastName')} />
            <input className="field" placeholder="Email" type="email" {...register('email')} />
            <input className="field" placeholder="Phone number" {...register('phoneNumber')} />
            <input className="field" placeholder="Password" type="password" {...register('password')} />
            <select className="field" {...register('role')}>
              <option value="viewer">viewer</option>
              <option value="operator">operator</option>
              <option value="manager">manager</option>
              <option value="admin">admin</option>
            </select>
            <input className="field md:col-span-2" placeholder="Default address (optional)" {...register('defaultAddress')} />

            <div className="md:col-span-2 flex items-center justify-between gap-3">
              <p className="text-xs text-[color:var(--danger)]">
                {formState.errors.firstName?.message || formState.errors.lastName?.message || formState.errors.email?.message || ''}
              </p>
              <button className="btn btn-primary" type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? 'Adding...' : 'Add User'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel overflow-x-auto p-5">
          {users.error ? (
            <p className="text-sm text-[color:var(--danger)]">{users.error instanceof Error ? users.error.message : 'Failed to load users'}</p>
          ) : null}

          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-[color:var(--muted)]">
                <th className="pb-2">Name</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(users.data ?? []).map((user) => (
                <tr key={user.id} className="border-t border-[color:var(--line)]">
                  <td className="py-2">{`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '-'}</td>
                  <td className="py-2 font-semibold">{user.email}</td>
                  <td className="py-2 uppercase tracking-[0.16em] text-xs text-[color:var(--muted)]">{user.role ?? 'n/a'}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => deleteUserMutation.mutate(user.id)}
                      disabled={deleteUserMutation.isPending}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </AdminShell>
    </AuthGuard>
  );
}
