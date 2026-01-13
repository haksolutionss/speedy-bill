import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUIStore, type CartItem } from '@/store/uiStore';
import type { DbTable } from '@/types/database';

const SYNC_DELAY_MS = 5000; // 5 seconds debounce for syncing cart to Supabase

interface DbCartItem {
  id: string;
  table_id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  portion: string;
  unit_price: number;
  quantity: number;
  gst_rate: number;
  notes: string | null;
  sent_to_kitchen: boolean;
  kot_printed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to sync cart data with Supabase for persistence across sessions and devices
 * - Debounces cart updates before syncing to reduce database writes
 * - Loads cart from Supabase when table is selected
 * - Clears cart items from Supabase when bill is created
 * - Handles real-time updates from other devices
 */
export function useCartSync() {
  const {
    selectedTable,
    cart,
    currentBillId,
    setSelectedTable,
  } = useUIStore();
  
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedCartRef = useRef<string>('');
  const isLoadingRef = useRef(false);

  // Load cart items from Supabase when table is selected
  const loadCartFromSupabase = useCallback(async (table: DbTable) => {
    if (!table?.id || isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    
    try {
      console.log('[CartSync] Loading cart for table:', table.id);
      
      const { data: cartItems, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('table_id', table.id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('[CartSync] Error loading cart:', error);
        return;
      }
      
      if (cartItems && cartItems.length > 0) {
        console.log('[CartSync] Found', cartItems.length, 'items in cart');
        
        const mappedItems: CartItem[] = cartItems.map((item: DbCartItem) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          productCode: item.product_code,
          portion: item.portion,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          gstRate: Number(item.gst_rate),
          notes: item.notes || undefined,
          sentToKitchen: item.sent_to_kitchen,
        }));
        
        // Update store with loaded items
        const store = useUIStore.getState();
        // Only update if we're still on the same table
        if (store.selectedTable?.id === table.id) {
          useUIStore.setState({ cart: mappedItems });
          lastSyncedCartRef.current = JSON.stringify(mappedItems);
        }
      } else {
        console.log('[CartSync] No cart items found for table');
      }
    } catch (err) {
      console.error('[CartSync] Error loading cart:', err);
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  // Sync cart to Supabase (debounced)
  const syncCartToSupabase = useCallback(async (tableId: string, cartItems: CartItem[]) => {
    if (!tableId) return;
    
    const cartJson = JSON.stringify(cartItems);
    if (cartJson === lastSyncedCartRef.current) {
      console.log('[CartSync] Cart unchanged, skipping sync');
      return;
    }
    
    console.log('[CartSync] Syncing', cartItems.length, 'items to Supabase for table:', tableId);
    
    try {
      // Delete existing cart items for this table
      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('table_id', tableId);
      
      if (deleteError) {
        console.error('[CartSync] Error deleting old cart items:', deleteError);
        return;
      }
      
      // Insert new cart items (only items that haven't been sent to kitchen yet, 
      // as KOT items are already in bill_items)
      const pendingItems = cartItems.filter(item => !item.sentToKitchen);
      
      if (pendingItems.length > 0) {
        const itemsToInsert = pendingItems.map(item => ({
          id: item.id,
          table_id: tableId,
          product_id: item.productId,
          product_name: item.productName,
          product_code: item.productCode,
          portion: item.portion,
          unit_price: item.unitPrice,
          quantity: item.quantity,
          gst_rate: item.gstRate,
          notes: item.notes || null,
          sent_to_kitchen: item.sentToKitchen,
          kot_printed_at: null,
        }));
        
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert(itemsToInsert);
        
        if (insertError) {
          console.error('[CartSync] Error inserting cart items:', insertError);
          return;
        }
      }
      
      lastSyncedCartRef.current = cartJson;
      console.log('[CartSync] Cart synced successfully');
    } catch (err) {
      console.error('[CartSync] Error syncing cart:', err);
    }
  }, []);

  // Clear cart items from Supabase when bill is created/settled
  const clearCartFromSupabase = useCallback(async (tableId: string) => {
    if (!tableId) return;
    
    console.log('[CartSync] Clearing cart from Supabase for table:', tableId);
    
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('table_id', tableId);
      
      if (error) {
        console.error('[CartSync] Error clearing cart:', error);
      } else {
        console.log('[CartSync] Cart cleared successfully');
        lastSyncedCartRef.current = '';
      }
    } catch (err) {
      console.error('[CartSync] Error clearing cart:', err);
    }
  }, []);

  // Load cart when table is selected
  useEffect(() => {
    if (selectedTable?.id && !currentBillId) {
      // Only load from cart_items if there's no active bill
      // (bills with items are loaded separately)
      loadCartFromSupabase(selectedTable);
    }
    
    // Clear local tracking when table changes
    if (!selectedTable) {
      lastSyncedCartRef.current = '';
    }
  }, [selectedTable?.id, currentBillId, loadCartFromSupabase]);

  // Debounced sync cart to Supabase when cart changes
  useEffect(() => {
    if (!selectedTable?.id || currentBillId) {
      // Don't sync if no table selected or if we have an active bill
      return;
    }
    
    // Cancel any pending sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    // Schedule new sync
    syncTimeoutRef.current = setTimeout(() => {
      syncCartToSupabase(selectedTable.id, cart);
    }, SYNC_DELAY_MS);
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [cart, selectedTable?.id, currentBillId, syncCartToSupabase]);

  // Real-time subscription for cart changes from other devices
  useEffect(() => {
    if (!selectedTable?.id) return;
    
    const channel = supabase
      .channel(`cart-${selectedTable.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `table_id=eq.${selectedTable.id}`,
        },
        (payload) => {
          console.log('[CartSync] Real-time update:', payload.eventType);
          
          // Only reload if we're not currently syncing
          if (!isLoadingRef.current && payload.eventType !== 'DELETE') {
            // Debounce to avoid rapid reloads
            setTimeout(() => {
              if (selectedTable?.id) {
                loadCartFromSupabase(selectedTable);
              }
            }, 500);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTable?.id, loadCartFromSupabase]);

  // Force sync on unmount or table change
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        // Perform immediate sync if there are pending changes
        const state = useUIStore.getState();
        if (state.selectedTable?.id && !state.currentBillId) {
          syncCartToSupabase(state.selectedTable.id, state.cart);
        }
      }
    };
  }, [syncCartToSupabase]);

  return {
    loadCartFromSupabase,
    syncCartToSupabase,
    clearCartFromSupabase,
    forceSync: useCallback(() => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (selectedTable?.id && !currentBillId) {
        syncCartToSupabase(selectedTable.id, cart);
      }
    }, [selectedTable?.id, currentBillId, cart, syncCartToSupabase]),
  };
}
