import { useMemo } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { calculateBillTotals, calculateGSTBreakdown } from '@/lib/billCalculations';

export function BillSummary() {
  const { cart, discountType, discountValue, discountReason } = useUIStore();
  const { settings } = useSettingsStore();
  
  const taxType = settings.tax.type;
  const currencySymbol = settings.currency.symbol;
  
  const totals = useMemo(() => {
    return calculateBillTotals(cart, discountType, discountValue, taxType);
  }, [cart, discountType, discountValue, taxType]);

  // Calculate GST by rate for display (only when tax type is 'gst')
  const gstByRate = useMemo(() => {
    return calculateGSTBreakdown(cart, totals.discountAmount, taxType);
  }, [cart, totals.discountAmount, taxType]);
  
  if (cart.length === 0) return null;
  
  const showGST = taxType === 'gst';
  
  return (
    <div className="border-t border-border p-4 space-y-1 bg-card/50">
      <div className="bill-row">
        <span className="text-muted-foreground">Sub Total</span>
        <span className="amount">{currencySymbol}{totals.subTotal.toFixed(2)}</span>
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
          <span className="amount">-{currencySymbol}{totals.discountAmount.toFixed(2)}</span>
        </div>
      )}
      
      {/* Only show GST breakdown when tax type is 'gst' */}
      {showGST && Object.entries(gstByRate).map(([rate, amount]) => (
        <div key={rate} className="bill-row text-xs">
          <span className="text-muted-foreground">GST @ {rate}% (CGST + SGST)</span>
          <span className="amount text-muted-foreground">{currencySymbol}{(amount as number).toFixed(2)}</span>
        </div>
      ))}
      
      {showGST && (
        <>
          <div className="bill-row text-xs">
            <span className="text-muted-foreground">CGST</span>
            <span className="amount text-muted-foreground">{currencySymbol}{totals.cgstAmount.toFixed(2)}</span>
          </div>
          
          <div className="bill-row text-xs">
            <span className="text-muted-foreground">SGST</span>
            <span className="amount text-muted-foreground">{currencySymbol}{totals.sgstAmount.toFixed(2)}</span>
          </div>
        </>
      )}
      
      <div className="bill-row-total">
        <span>Final Amount</span>
        <span className="amount amount-positive text-lg">{currencySymbol}{totals.finalAmount}</span>
      </div>
    </div>
  );
}
