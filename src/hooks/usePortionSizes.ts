import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePortionSizes() {
  return useQuery({
    queryKey: ['portion-sizes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portion_sizes')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true }); // or created_at

      if (error) throw error;

      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
