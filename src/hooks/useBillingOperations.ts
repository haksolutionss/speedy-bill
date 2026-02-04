import { useCallback } from 'react';
import { toast } from 'sonner';
import { useUIStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { supabase } from '@/integrations/supabase/client';
import { calculateBillTotals } from '@/lib/billCalculations';
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

  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('table_id', tableId);

    if (error) {
      console.error('[BillingOps] Error clearing cart:', error);
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
    resetBillingState,
    markItemsSentToKitchen,
    getNextToken,
    setCurrentBillId,
    incrementBillNumber,
  } = useUIStore();

  const { settings, calculateLoyaltyPoints } = useSettingsStore();
  const taxType = settings.tax.type;

  const [createBill] = useCreateBillMutation();
  const [updateBill] = useUpdateBillMutation();
  const [updateTable] = useUpdateTableMutation();
  const [markItemsAsKOT] = useMarkItemsAsKOTMutation();
  const [addPaymentDetails] = useAddPaymentDetailsMutation();

  // -----------------------------------
  // SAVE OR UPDATE BILL (returns billId)
  // -----------------------------------
  const saveOrUpdateBill = useCallback(async (): Promise<string | null> => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return null;
    }

    const totals = calculateBillTotals(cart, discountType, discountValue, taxType);

    try {
      // UPDATE
      if (currentBillId) {
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
      }

      // CREATE
      const billNumber = incrementBillNumber();

      const billData = {
        bill_number: billNumber,
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

      if (selectedTable) {
        // Set table to 'occupied' when bill is created (before KOT is printed)
        await updateTable({
          id: selectedTable.id,
          updates: {
            status: 'occupied',
            current_bill_id: result.id,
            current_amount: totals.finalAmount,
          },
        }).unwrap();

        await clearCartFromSupabase(selectedTable.id);
      }

      setCurrentBillId(result.id);
      return result.id;
    } catch (error) {
      console.error('[BillingOps] Error saving bill:', error);
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
    incrementBillNumber,
  ]);

  // -----------------------------------
  // PRINT KOT (RETURNS billId 🔥)
  // Updates table status to 'active' after KOT is printed
  // -----------------------------------
  const printKOT = useCallback(async (): Promise<string | null> => {
    const pendingItems = cart.filter(
      (item) => !item.sentToKitchen || item.quantity > item.printedQuantity
    );

    if (pendingItems.length === 0) {
      toast.info('No new items to send to kitchen');
      return null;
    }

    try {
      const billId = await saveOrUpdateBill();
      if (!billId) return null;

      const itemIds = pendingItems.map((item) => item.id);

      await markItemsAsKOT({ billId, itemIds }).unwrap();

      // After KOT is printed, update table status to 'active'
      if (selectedTable) {
        await updateTable({
          id: selectedTable.id,
          updates: {
            status: 'occupied',
          },
        }).unwrap();
      }

      markItemsSentToKitchen();

      return billId;
    } catch (error) {
      console.error('[BillingOps] Error printing KOT:', error);
      toast.error('Failed to send KOT');
      return null;
    }
  }, [cart, selectedTable, saveOrUpdateBill, markItemsAsKOT, markItemsSentToKitchen, updateTable]);

  // -----------------------------------
  // SETTLE BILL (unchanged contract)
  // -----------------------------------
  const settleBill = useCallback(
    async (
      paymentMethod: 'cash' | 'card' | 'upi' | 'split',
      paymentDetails?: { method: 'cash' | 'card' | 'upi'; amount: number }[],
      customerId?: string,
      loyaltyPointsUsed?: number,
      finalAmount?: number
    ) => {
      if (cart.length === 0) {
        toast.error('Cart is empty');
        return false;
      }

      const tableToUpdate = selectedTable;

      (async () => {
        try {
          let billId = currentBillId ?? (await saveOrUpdateBill());
          if (!billId) return;

          await updateBill({
            id: billId,
            updates: {
              status: 'settled',
              payment_method: paymentMethod,
              settled_at: new Date().toISOString(),
              customer_id: customerId || null,
            },
          }).unwrap();

          if (paymentMethod === 'split' && paymentDetails) {
            await addPaymentDetails({ billId, payments: paymentDetails }).unwrap();
          }

          if (customerId) {
            const { data } = await supabase
              .from('customers')
              .select('loyalty_points')
              .eq('id', customerId)
              .single();

            if (data) {
              const used = loyaltyPointsUsed || 0;
              const amount =
                finalAmount ??
                calculateBillTotals(cart, discountType, discountValue, taxType).finalAmount;

              const earned = calculateLoyaltyPoints(amount);

              await supabase
                .from('customers')
                .update({
                  loyalty_points: Math.max(0, data.loyalty_points - used + earned),
                })
                .eq('id', customerId);
            }
          }

          if (tableToUpdate) {
            await updateTable({
              id: tableToUpdate.id,
              updates: {
                status: 'available',
                current_bill_id: null,
                current_amount: null,
              },
            }).unwrap();

            await clearCartFromSupabase(tableToUpdate.id);
          }

          resetBillingState();
        } catch (error) {
          console.error('[BillingOps] Error settling bill:', error);
        }
      })();

      return true;
    },
    [
      cart,
      currentBillId,
      selectedTable,
      discountType,
      discountValue,
      saveOrUpdateBill,
      updateBill,
      updateTable,
      addPaymentDetails,
      resetBillingState,
      calculateLoyaltyPoints,
    ]
  );

  // -----------------------------------
  // SAVE AS UNSETTLED
  // -----------------------------------
  const saveAsUnsettled = useCallback(async (): Promise<boolean> => {
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

      if (selectedTable) {
        await clearCartFromSupabase(selectedTable.id);
      }

      resetBillingState();
      return true;
    } catch (error) {
      console.error('[BillingOps] Error saving unsettled bill:', error);
      toast.error('Failed to save bill');
      return false;
    }
  }, [cart, selectedTable, saveOrUpdateBill, updateBill, resetBillingState]);

  return {
    saveOrUpdateBill,
    printKOT, // 🔥 now returns billId
    settleBill,
    saveAsUnsettled,
  };
}
