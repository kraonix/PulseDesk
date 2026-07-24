import React from 'react';
import { useUsers } from '../hooks/useUsers';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';

const roleVariant: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  ADMIN:  'danger',
  MEMBER: 'purple',
};

export function UsersPage() {
  const { data: users, isLoading, isError } = useUsers();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <p className="mt-1 text-sm text-gray-500">
          {users ? `${users.length} member${users.length !== 1 ? 's' : ''}` : ''}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="text-sm text-red-600">Failed to load team members.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users?.map((user) => (
            <Card key={user.id} padding="sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-sm font-semibold">
                  {user.name[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="truncate text-xs text-gray-500">{user.email}</p>
                </div>
                <Badge variant={roleVariant[user.role] ?? 'default'}>
                  {user.role === 'ADMIN' ? 'Admin' : 'Member'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
