import { useCallback } from 'react';
import { toast } from 'sonner';
import { useUIStore, calculateBillTotals, type CartItem } from '@/store/uiStore';
import { supabase } from '@/integrations/supabase/client';
import {
  useCreateBillMutation,
  useUpdateBillMutation,
  useUpdateTableMutation,
  useMarkItemsAsKOTMutation,
  useAddPaymentDetailsMutation,
} from '@/store/redux/api/billingApi';
import type { DbBillItem } from '@/types/database';

// Helper function to clear cart items from Supabase
async function clearCartFromSupabase(tableId: string) {
  if (!tableId) return;
  
  console.log('[BillingOps] Clearing cart from Supabase for table:', tableId);
  
  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('table_id', tableId);
    
    if (error) {
      console.error('[BillingOps] Error clearing cart:', error);
    } else {
      console.log('[BillingOps] Cart cleared successfully');
    }
  } catch (err) {
    console.error('[BillingOps] Error clearing cart:', err);
  }
}

export function useBillingOperations() {
  const {
    selectedTable,
    isParcelMode,
    currentBillId,
    cart,
    coverCount,
    discountType,
    discountValue,
    discountReason,
    clearCart,
    resetBillingState,
    markItemsSentToKitchen,
    getNextToken,
    setCurrentBillId,
  } = useUIStore();

  const [createBill] = useCreateBillMutation();
  const [updateBill] = useUpdateBillMutation();
  const [updateTable] = useUpdateTableMutation();
  const [markItemsAsKOT] = useMarkItemsAsKOTMutation();
  const [addPaymentDetails] = useAddPaymentDetailsMutation();

  const saveOrUpdateBill = useCallback(async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return null;
    }

    const totals = calculateBillTotals(cart, discountType, discountValue);

    try {
      if (currentBillId) {
        // Update existing bill
        await updateBill({
          id: currentBillId,
          updates: {
            sub_total: totals.subTotal,
            discount_type: discountType,
            discount_value: discountValue,
            discount_reason: discountReason,
            discount_amount: totals.discountAmount,
            cgst_amount: totals.cgstAmount,
            sgst_amount: totals.sgstAmount,
            total_amount: totals.totalAmount,
            final_amount: totals.finalAmount,
            cover_count: coverCount,
          },
        }).unwrap();

        return currentBillId;
      } else {
        // Create new bill
        const billData = {
          type: isParcelMode ? 'parcel' : 'table',
          table_id: selectedTable?.id || null,
          table_number: selectedTable?.number || null,
          token_number: isParcelMode ? getNextToken() : null,
          sub_total: totals.subTotal,
          discount_type: discountType,
          discount_value: discountValue,
          discount_reason: discountReason,
          discount_amount: totals.discountAmount,
          cgst_amount: totals.cgstAmount,
          sgst_amount: totals.sgstAmount,
          total_amount: totals.totalAmount,
          final_amount: totals.finalAmount,
          cover_count: coverCount,
          status: 'active' as const,
        };

        const items: Partial<DbBillItem>[] = cart.map((item) => ({
          product_id: item.productId,
          product_name: item.productName,
          product_code: item.productCode,
          portion: item.portion,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          gst_rate: item.gstRate,
          notes: item.notes || null,
          sent_to_kitchen: item.sentToKitchen,
          kot_printed_at: item.sentToKitchen ? new Date().toISOString() : null,
        }));

        const result = await createBill({ bill: billData, items }).unwrap();

        // Update table status if table order
        if (selectedTable) {
          await updateTable({
            id: selectedTable.id,
            updates: {
              status: 'occupied',
              current_bill_id: result.id,
              current_amount: totals.finalAmount,
            },
          }).unwrap();
          
          // Clear cart items from Supabase since they're now in bill_items
          await clearCartFromSupabase(selectedTable.id);
        }

        // Update current bill ID in store
        setCurrentBillId(result.id);

        return result.id;
      }
    } catch (error) {
      console.error('Error saving bill:', error);
      toast.error('Failed to save bill');
      return null;
    }
  }, [
    cart,
    currentBillId,
    selectedTable,
    isParcelMode,
    coverCount,
    discountType,
    discountValue,
    discountReason,
    createBill,
    updateBill,
    updateTable,
    getNextToken,
    setCurrentBillId,
  ]);

  const printKOT = useCallback(async () => {
    const pendingItems = cart.filter((item) => !item.sentToKitchen);
    if (pendingItems.length === 0) {
      toast.info('No new items to send to kitchen');
      return false;
    }

    try {
      // First save/update the bill
      const billId = await saveOrUpdateBill();
      if (!billId) return false;

      // Mark items as sent to kitchen
      const itemIds = pendingItems.map((item) => item.id);
      await markItemsAsKOT({ billId, itemIds }).unwrap();

      // Update local state
      markItemsSentToKitchen();

      toast.success(`KOT sent: ${pendingItems.length} item(s)`);
      return true;
    } catch (error) {
      console.error('Error printing KOT:', error);
      toast.error('Failed to send KOT');
      return false;
    }
  }, [cart, saveOrUpdateBill, markItemsAsKOT, markItemsSentToKitchen]);

  const settleBill = useCallback(
    async (
      paymentMethod: 'cash' | 'card' | 'upi' | 'split',
      paymentDetails?: { method: 'cash' | 'card' | 'upi'; amount: number }[],
      customerId?: string,
      loyaltyPointsUsed?: number
    ) => {
      if (cart.length === 0) {
        toast.error('Cart is empty');
        return false;
      }

      try {
        // First save/update the bill
        let billId = currentBillId;
        if (!billId) {
          billId = await saveOrUpdateBill();
          if (!billId) return false;
        }

        // Update bill status to settled
        await updateBill({
          id: billId,
          updates: {
            status: 'settled',
            payment_method: paymentMethod,
            settled_at: new Date().toISOString(),
            customer_id: customerId || null,
          },
        }).unwrap();

        // Add payment details if split payment
        if (paymentMethod === 'split' && paymentDetails) {
          await addPaymentDetails({
            billId,
            payments: paymentDetails,
          }).unwrap();
        }

        // Update customer loyalty points if customer selected
        if (customerId && loyaltyPointsUsed && loyaltyPointsUsed > 0) {
          // Fetch current points and deduct used points
          const { data: customerData } = await supabase
            .from('customers')
            .select('loyalty_points')
            .eq('id', customerId)
            .single();
          
          if (customerData) {
            await supabase
              .from('customers')
              .update({ loyalty_points: Math.max(0, customerData.loyalty_points - loyaltyPointsUsed) })
              .eq('id', customerId);
          }
        }

        // Free up the table and clear cart from Supabase
        if (selectedTable) {
          await updateTable({
            id: selectedTable.id,
            updates: {
              status: 'available',
              current_bill_id: null,
              current_amount: null,
            },
          }).unwrap();
          
          // Clear any remaining cart items from Supabase
          await clearCartFromSupabase(selectedTable.id);
        }

        // Reset local state
        resetBillingState();

        toast.success('Bill settled successfully');
        return true;
      } catch (error) {
        console.error('Error settling bill:', error);
        toast.error('Failed to settle bill');
        return false;
      }
    },
    [cart, currentBillId, selectedTable, discountType, discountValue, saveOrUpdateBill, updateBill, updateTable, addPaymentDetails, resetBillingState]
  );

  const saveAsUnsettled = useCallback(async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return false;
    }

    try {
      const billId = await saveOrUpdateBill();
      if (!billId) return false;

      await updateBill({
        id: billId,
        updates: { status: 'unsettled' },
      }).unwrap();

      // Clear cart from Supabase when saving as unsettled
      if (selectedTable) {
        await clearCartFromSupabase(selectedTable.id);
      }

      resetBillingState();
      toast.success('Bill saved as unsettled');
      return true;
    } catch (error) {
      console.error('Error saving unsettled bill:', error);
      toast.error('Failed to save bill');
      return false;
    }
  }, [cart, selectedTable, saveOrUpdateBill, updateBill, resetBillingState]);

  return {
    saveOrUpdateBill,
    printKOT,
    settleBill,
    saveAsUnsettled,
  };
}
