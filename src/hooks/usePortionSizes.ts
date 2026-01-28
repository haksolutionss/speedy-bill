import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DbPortionSize } from '@/types/database';

export function usePortionSizes(activeOnly = true) {
  return useQuery({
    queryKey: ['portion-sizes', activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('portion_sizes')
        .select('*')
        .order('name', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as DbPortionSize[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
