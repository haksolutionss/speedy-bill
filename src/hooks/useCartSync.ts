import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUIStore, type CartItem } from '@/store/uiStore';
import type { DbTable } from '@/types/database';

const SYNC_DELAY_MS = 1000; // 1 second debounce for syncing cart to Supabase

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
 * - Loads cart from Supabase when table is selected (from cart_items or bill_items)
 * - Clears cart items from Supabase when bill is created
 * - Handles real-time updates from other devices
 */
export function useCartSync() {
  const {
    selectedTable,
    cart,
    currentBillId,
    setCart,
    setCurrentBillId,
  } = useUIStore();
  
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedCartRef = useRef<string>('');
  const isLoadingRef = useRef(false);
  const isSyncingRef = useRef(false);

  // Load cart items - first check for active bill, then check cart_items table
  const loadCartForTable = useCallback(async (table: DbTable) => {
    if (!table?.id) return;
    
    // Reset loading state for new table
    isLoadingRef.current = true;
    
    try {
      console.log('[CartSync] Loading cart for table:', table.id, 'current_bill_id:', table.current_bill_id);
      
      // First check if table has an active bill - load from bill_items
      if (table.current_bill_id) {
        const { data: billItems, error: billError } = await supabase
          .from('bill_items')
          .select('*')
          .eq('bill_id', table.current_bill_id)
          .order('created_at', { ascending: true });
        
        if (billError) {
          console.error('[CartSync] Error loading bill items:', billError);
        } else if (billItems && billItems.length > 0) {
          console.log('[CartSync] Found', billItems.length, 'items in active bill');
          
          const mappedItems: CartItem[] = billItems.map((item) => ({
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
          
          setCart(mappedItems);
          setCurrentBillId(table.current_bill_id);
          lastSyncedCartRef.current = JSON.stringify(mappedItems);
          isLoadingRef.current = false;
          return;
        }
      }
      
      // No active bill - check cart_items for unsaved cart data
      const { data: cartItems, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('table_id', table.id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('[CartSync] Error loading cart:', error);
        isLoadingRef.current = false;
        return;
      }
      
      if (cartItems && cartItems.length > 0) {
        console.log('[CartSync] Found', cartItems.length, 'items in cart_items');
        
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
        
        setCart(mappedItems);
        lastSyncedCartRef.current = JSON.stringify(mappedItems);
      } else {
        console.log('[CartSync] No cart items found for table');
      }
    } catch (err) {
      console.error('[CartSync] Error loading cart:', err);
    } finally {
      isLoadingRef.current = false;
    }
  }, [setCart, setCurrentBillId]);

  // Sync cart to Supabase
  const syncCartToSupabase = useCallback(async (tableId: string, cartItems: CartItem[]) => {
    if (!tableId || isSyncingRef.current) return;
    
    const cartJson = JSON.stringify(cartItems);
    if (cartJson === lastSyncedCartRef.current) {
      console.log('[CartSync] Cart unchanged, skipping sync');
      return;
    }
    
    isSyncingRef.current = true;
    console.log('[CartSync] Syncing', cartItems.length, 'items to Supabase for table:', tableId);
    
    try {
      // Delete existing cart items for this table
      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('table_id', tableId);
      
      if (deleteError) {
        console.error('[CartSync] Error deleting old cart items:', deleteError);
        isSyncingRef.current = false;
        return;
      }
      
      // Insert ALL cart items
      if (cartItems.length > 0) {
        const itemsToInsert = cartItems.map(item => ({
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
          isSyncingRef.current = false;
          return;
        }
      }
      
      lastSyncedCartRef.current = cartJson;
      console.log('[CartSync] Cart synced successfully');
    } catch (err) {
      console.error('[CartSync] Error syncing cart:', err);
    } finally {
      isSyncingRef.current = false;
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
    if (selectedTable?.id) {
      loadCartForTable(selectedTable);
    } else {
      // Clear local tracking when no table selected
      lastSyncedCartRef.current = '';
    }
  }, [selectedTable?.id, loadCartForTable]);

  // Debounced sync cart to Supabase when cart changes
  // Only sync when we DON'T have an active bill (cart_items is for pre-bill storage)
  useEffect(() => {
    // Don't sync if no table selected, if loading, or if we have an active bill
    if (!selectedTable?.id || isLoadingRef.current || currentBillId) {
      return;
    }
    
    // Cancel any pending sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    // Schedule new sync with shorter delay
    syncTimeoutRef.current = setTimeout(() => {
      syncCartToSupabase(selectedTable.id, cart);
    }, SYNC_DELAY_MS);
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [cart, selectedTable?.id, currentBillId, syncCartToSupabase]);

  // Immediate sync when switching tables (before table changes)
  const syncBeforeTableChange = useCallback(async () => {
    const state = useUIStore.getState();
    if (state.selectedTable?.id && !state.currentBillId && state.cart.length > 0) {
      // Cancel any pending debounced sync
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      // Force immediate sync
      await syncCartToSupabase(state.selectedTable.id, state.cart);
    }
  }, [syncCartToSupabase]);

  return {
    loadCartForTable,
    syncCartToSupabase,
    clearCartFromSupabase,
    syncBeforeTableChange,
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
