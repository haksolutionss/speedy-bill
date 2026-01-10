import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { billingApi } from '@/store/redux/api/billingApi';
import { useAppDispatch } from '@/store/redux/hooks';

type TableName = 'tables' | 'bills' | 'bill_items';

export function useRealtimeSubscription(tables: TableName[]) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const channels = tables.map((tableName) => {
      const channel = supabase
        .channel(`realtime-${tableName}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName,
          },
          (payload) => {
            console.log(`Realtime update for ${tableName}:`, payload);
            
            // Invalidate relevant cache tags based on table
            switch (tableName) {
              case 'tables':
                dispatch(billingApi.util.invalidateTags(['Tables', 'TableSections']));
                break;
              case 'bills':
                dispatch(billingApi.util.invalidateTags(['Bills']));
                break;
              case 'bill_items':
                dispatch(billingApi.util.invalidateTags(['BillItems', 'Bills']));
                break;
            }
          }
        )
        .subscribe();

      return channel;
    });

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [dispatch, tables.join(',')]);
}
