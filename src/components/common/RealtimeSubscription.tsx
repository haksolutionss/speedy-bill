import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { billingApi } from '@/store/redux/api/billingApi';
import { useAppDispatch } from '@/store/redux/hooks';

export function RealtimeSubscription() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Subscribe to table changes
    const tablesChannel = supabase
      .channel('tables-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        () => {
          dispatch(billingApi.util.invalidateTags(['Tables', 'TableSections']));
        }
      )
      .subscribe();

    // Subscribe to bill changes
    const billsChannel = supabase
      .channel('bills-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bills' },
        () => {
          dispatch(billingApi.util.invalidateTags(['Bills']));
        }
      )
      .subscribe();

    // Subscribe to bill items changes
    const billItemsChannel = supabase
      .channel('bill-items-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bill_items' },
        () => {
          dispatch(billingApi.util.invalidateTags(['BillItems', 'Bills']));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tablesChannel);
      supabase.removeChannel(billsChannel);
      supabase.removeChannel(billItemsChannel);
    };
  }, [dispatch]);

  return null;
}
