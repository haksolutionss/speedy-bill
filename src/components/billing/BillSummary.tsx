import { useMemo } from 'react';
import { useBillingStore } from '@/store/billingStore';

export function BillSummary() {
  const { cart, currentBill } = useBillingStore();
  
  const totals = useMemo(() => {
    const subTotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    
    let discountAmount = 0;
    if (currentBill?.discountType && currentBill?.discountValue) {
      discountAmount = currentBill.discountType === 'percentage'
        ? (subTotal * currentBill.discountValue / 100)
        : currentBill.discountValue;
    }
    
    const afterDiscount = subTotal - discountAmount;
    
    // Calculate GST
    const gstByRate: Record<number, number> = {};
    cart.forEach(item => {
      const itemTotal = item.unitPrice * item.quantity;
      const itemDiscount = discountAmount > 0 ? (itemTotal / subTotal) * discountAmount : 0;
      const taxableAmount = itemTotal - itemDiscount;
      const gst = taxableAmount * (item.gstRate / 100);
      gstByRate[item.gstRate] = (gstByRate[item.gstRate] || 0) + gst;
    });
    
    const totalGst = Object.values(gstByRate).reduce((sum, gst) => sum + gst, 0);
    const cgst = totalGst / 2;
    const sgst = totalGst / 2;
    
    const totalAmount = afterDiscount + totalGst;
    const finalAmount = Math.round(totalAmount);
    
    return { subTotal, discountAmount, cgst, sgst, totalAmount, finalAmount, gstByRate };
  }, [cart, currentBill]);
  
  if (cart.length === 0) return null;
  
  return (
    <div className="border-t border-border p-4 space-y-1 bg-card/50">
      <div className="bill-row">
        <span className="text-muted-foreground">Sub Total</span>
        <span className="amount">₹{totals.subTotal.toFixed(2)}</span>
      </div>
      
      {totals.discountAmount > 0 && (
        <div className="bill-row text-success">
          <span>
            Discount
            {currentBill?.discountType === 'percentage' && ` (${currentBill.discountValue}%)`}
            {currentBill?.discountReason && (
              <span className="text-xs text-muted-foreground ml-2">- {currentBill.discountReason}</span>
            )}
          </span>
          <span className="amount">-₹{totals.discountAmount.toFixed(2)}</span>
        </div>
      )}
      
      {Object.entries(totals.gstByRate).map(([rate, amount]) => (
        <div key={rate} className="bill-row text-xs">
          <span className="text-muted-foreground">GST @ {rate}% (CGST + SGST)</span>
          <span className="amount text-muted-foreground">₹{amount.toFixed(2)}</span>
        </div>
      ))}
      
      <div className="bill-row text-xs">
        <span className="text-muted-foreground">CGST</span>
        <span className="amount text-muted-foreground">₹{totals.cgst.toFixed(2)}</span>
      </div>
      
      <div className="bill-row text-xs">
        <span className="text-muted-foreground">SGST</span>
        <span className="amount text-muted-foreground">₹{totals.sgst.toFixed(2)}</span>
      </div>
      
      <div className="bill-row-total">
        <span>Final Amount</span>
        <span className="amount amount-positive text-lg">₹{totals.finalAmount}</span>
      </div>
    </div>
  );
}
