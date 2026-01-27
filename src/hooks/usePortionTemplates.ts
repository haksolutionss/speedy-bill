import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PortionTemplate } from '@/types/portionTemplates';

export function usePortionTemplates() {
  return useQuery({
    queryKey: ['portion-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portion_templates')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as PortionTemplate[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
