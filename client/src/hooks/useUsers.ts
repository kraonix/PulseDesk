import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data.data as Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        avatarUrl: string | null;
      }>;
    },
  });
}
