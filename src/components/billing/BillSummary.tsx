import { useMemo } from 'react';
import { useUIStore, calculateBillTotals } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { GstToggle } from './GstToggle';

export function BillSummary() {
  const { cart, discountType, discountValue, discountReason } = useUIStore();
  const { settings } = useSettingsStore();
  
  const isGstEnabled = settings.tax.type !== 'none';
  
  const totals = useMemo(() => {
    return calculateBillTotals(cart, discountType, discountValue);
  }, [cart, discountType, discountValue]);

  // Calculate GST by rate for display
  const gstByRate = useMemo(() => {
    const result: Record<number, number> = {};
    const subTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    
    cart.forEach(item => {
      const itemTotal = item.unitPrice * item.quantity;
      const itemDiscount = totals.discountAmount > 0 ? (itemTotal / subTotal) * totals.discountAmount : 0;
      const taxableAmount = itemTotal - itemDiscount;
      const gst = taxableAmount * (item.gstRate / 100);
      result[item.gstRate] = (result[item.gstRate] || 0) + gst;
    });
    
    return result;
  }, [cart, totals.discountAmount]);

  // Calculate final amount based on GST setting
  const finalAmount = isGstEnabled 
    ? totals.finalAmount 
    : Math.round(totals.subTotal - totals.discountAmount);
  
  if (cart.length === 0) return null;
  
  return (
    <div className="border-t border-border p-4 space-y-1 bg-card/50">
      {/* GST Toggle in header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/50">
        <span className="text-sm font-medium">Bill Summary</span>
        <GstToggle />
      </div>

      <div className="bill-row">
        <span className="text-muted-foreground">Sub Total</span>
        <span className="amount">₹{totals.subTotal.toFixed(2)}</span>
      </div>
      
      {totals.discountAmount > 0 && (
        <div className="bill-row text-success">
          <span>
            Discount
            {discountType === 'percentage' && ` (${discountValue}%)`}
            {discountReason && (
              <span className="text-xs text-muted-foreground ml-2">- {discountReason}</span>
            )}
          </span>
          <span className="amount">-₹{totals.discountAmount.toFixed(2)}</span>
        </div>
      )}
      
      {isGstEnabled && (
        <>
          {Object.entries(gstByRate).map(([rate, amount]) => (
            <div key={rate} className="bill-row text-xs">
              <span className="text-muted-foreground">GST @ {rate}% (CGST + SGST)</span>
              <span className="amount text-muted-foreground">₹{(amount as number).toFixed(2)}</span>
            </div>
          ))}
          
          <div className="bill-row text-xs">
            <span className="text-muted-foreground">CGST</span>
            <span className="amount text-muted-foreground">₹{totals.cgstAmount.toFixed(2)}</span>
          </div>
          
          <div className="bill-row text-xs">
            <span className="text-muted-foreground">SGST</span>
            <span className="amount text-muted-foreground">₹{totals.sgstAmount.toFixed(2)}</span>
          </div>
        </>
      )}
      
      <div className="bill-row-total">
        <span>Final Amount</span>
        <span className="amount amount-positive text-lg">₹{finalAmount}</span>
      </div>
    </div>
  );
}
