/**
 * Centralized bill calculations with GST toggle support
 * All bill-related calculations should use these functions
 */

import type { CartItem } from '@/store/uiStore';
import type { TaxType } from '@/types/settings';

interface BillTotals {
  subTotal: number;
  discountAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  finalAmount: number;
}

/**
 * Calculate bill totals with optional GST
 * @param items - Cart items
 * @param discountType - Type of discount (percentage or fixed)
 * @param discountValue - Discount value
 * @param taxType - Tax type from settings ('gst', 'other', 'none')
 */
export function calculateBillTotals(
  items: CartItem[],
  discountType?: 'percentage' | 'fixed' | null,
  discountValue?: number | null,
  taxType: TaxType = 'gst'
): BillTotals {
  const subTotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  let discountAmount = 0;
  if (discountType && discountValue) {
    discountAmount = discountType === 'percentage'
      ? (subTotal * discountValue) / 100
      : discountValue;
  }

  const afterDiscount = subTotal - discountAmount;

  // Only calculate GST if tax type is 'gst'
  let cgstAmount = 0;
  let sgstAmount = 0;

  if (taxType === 'gst') {
    // Calculate GST by rate
    const gstByRate: Record<number, number> = {};
    items.forEach((item) => {
      const itemTotal = item.unitPrice * item.quantity;
      const itemDiscount = discountAmount > 0 ? (itemTotal / subTotal) * discountAmount : 0;
      const taxableAmount = itemTotal - itemDiscount;
      const gst = taxableAmount * (item.gstRate / 100);
      gstByRate[item.gstRate] = (gstByRate[item.gstRate] || 0) + gst;
    });

    const totalGst = Object.values(gstByRate).reduce((sum, gst) => sum + gst, 0);
    cgstAmount = totalGst / 2;
    sgstAmount = totalGst / 2;
  }

  const totalAmount = afterDiscount + cgstAmount + sgstAmount;
  const finalAmount = Math.round(totalAmount);

  return { subTotal, discountAmount, cgstAmount, sgstAmount, totalAmount, finalAmount };
}

/**
 * Calculate GST breakdown by rate
 * Returns empty object if tax is disabled
 */
export function calculateGSTBreakdown(
  items: CartItem[],
  discountAmount: number,
  taxType: TaxType = 'gst'
): Record<number, number> {
  if (taxType !== 'gst') {
    return {};
  }

  const subTotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const result: Record<number, number> = {};

  items.forEach(item => {
    const itemTotal = item.unitPrice * item.quantity;
    const itemDiscount = discountAmount > 0 ? (itemTotal / subTotal) * discountAmount : 0;
    const taxableAmount = itemTotal - itemDiscount;
    const gst = taxableAmount * (item.gstRate / 100);
    result[item.gstRate] = (result[item.gstRate] || 0) + gst;
  });

  return result;
}
