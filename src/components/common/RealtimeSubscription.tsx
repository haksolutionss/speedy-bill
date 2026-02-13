import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { billingApi } from '@/store/redux/api/billingApi';
import { useAppDispatch } from '@/store/redux/hooks';
import { useUIStore } from '@/store/uiStore';

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

    // Subscribe to bill changes - also sync latest bill number
    const billsChannel = supabase
      .channel('bills-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bills' },
        (payload) => {
          dispatch(billingApi.util.invalidateTags(['Bills']));
          // Sync latest bill number across devices in real-time
          const newBillNumber = (payload.new as any)?.bill_number;
          if (newBillNumber) {
            useUIStore.setState({ currentBillNumber: newBillNumber });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bills' },
        () => {
          dispatch(billingApi.util.invalidateTags(['Bills']));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'bills' },
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

    // Subscribe to cart_items changes to refresh table status/highlighting
    const cartItemsChannel = supabase
      .channel('cart-items-global-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cart_items' },
        () => {
          // Invalidate tables so table grid re-fetches and shows updated status
          dispatch(billingApi.util.invalidateTags(['Tables', 'TableSections']));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tablesChannel);
      supabase.removeChannel(billsChannel);
      supabase.removeChannel(billItemsChannel);
      supabase.removeChannel(cartItemsChannel);
    };
  }, [dispatch]);

  return null;
}
