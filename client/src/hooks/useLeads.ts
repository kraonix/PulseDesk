import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface LeadFilters {
  page?:         number;
  pageSize?:     number;
  status?:       string;
  source?:       string;
  search?:       string;
  assignedToId?: string;
}

export function useLeads(filters: LeadFilters = {}) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
      );
      const res = await api.get('/leads', { params });
      return res.data.data;
    },
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: async () => {
      const res = await api.get(`/leads/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post('/leads', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateLead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.patch(`/leads/${id}`, data);
      return res.data.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['leads', id], updated);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useAddNote(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { body: string }) => {
      const res = await api.post(`/leads/${leadId}/notes`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', leadId] });
    },
  });
}
