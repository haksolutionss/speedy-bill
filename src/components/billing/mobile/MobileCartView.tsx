import { useState } from 'react';
import { Trash2, Plus, Minus, UtensilsCrossed, Printer, CreditCard, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore, calculateBillTotals } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useBillingOperations } from '@/hooks/useBillingOperations';
import { cn } from '@/lib/utils';
import { PaymentModal } from '../PaymentModal';
import { DiscountModal } from '../DiscountModal';
import { GstToggle } from '../GstToggle';

export function MobileCartView() {
  const [showPayment, setShowPayment] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  
  const { 
    cart, 
    updateCartItem, 
    removeFromCart, 
    discountType, 
    discountValue,
    discountReason,
    setDiscount,
    selectedTable,
    isParcelMode,
  } = useUIStore();
  
  const { settings } = useSettingsStore();
  const { printKOT, settleBill, saveAsUnsettled } = useBillingOperations();

  const isGstEnabled = settings.tax.type !== 'none';
  const totals = calculateBillTotals(cart, discountType, discountValue);

  const handleQuantityChange = (itemId: string, delta: number) => {
    const item = cart.find(i => i.id === itemId);
    if (item) {
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        removeFromCart(itemId);
      } else {
        updateCartItem(itemId, { quantity: newQty });
      }
    }
  };

  const handleKOT = async () => {
    await printKOT();
  };

  const handlePayment = async (method: 'cash' | 'card' | 'upi') => {
    await settleBill(method);
    setShowPayment(false);
  };

  const handleSaveUnsettledBill = async () => {
    await saveAsUnsettled();
    setShowPayment(false);
  };

  const handleApplyDiscount = (
    type: 'percentage' | 'fixed' | null,
    value: number | null,
    reason: string | null
  ) => {
    setDiscount(type, value, reason);
  };

  if (cart.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
        <UtensilsCrossed className="h-16 w-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Cart is empty</p>
        <p className="text-sm text-center mt-1">
          Add items from the Products tab
        </p>
      </div>
    );
  }

  const finalTotal = isGstEnabled 
    ? totals.finalAmount 
    : Math.round(totals.subTotal - totals.discountAmount);

  return (
    <div className="h-full flex flex-col">
      {/* Header with GST Toggle */}
      <div className="shrink-0 p-3 border-b border-border flex items-center justify-between">
        <span className="text-sm font-medium">
          {cart.length} {cart.length === 1 ? 'item' : 'items'}
        </span>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs h-7"
            onClick={() => setShowDiscount(true)}
          >
            <Percent className="h-3 w-3" />
            Discount
          </Button>
          <GstToggle />
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {cart.map((item) => (
          <div
            key={item.id}
            className={cn(
              "p-3 border-b border-border",
              item.sentToKitchen && "bg-muted/30"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{item.productName}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {item.portion} • ₹{item.unitPrice}
                </div>
                {item.sentToKitchen && (
                  <span className="inline-block mt-1 text-[10px] bg-success/20 text-success px-1.5 py-0.5 rounded">
                    Sent to Kitchen
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleQuantityChange(item.id, -1)}
                  disabled={item.sentToKitchen && item.quantity <= item.printedQuantity}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-6 text-center font-medium">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleQuantityChange(item.id, 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="text-right">
                <div className="font-bold text-success">
                  ₹{(item.unitPrice * item.quantity).toFixed(0)}
                </div>
                {!item.sentToKitchen && (
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-destructive mt-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bill Summary */}
      <div className="shrink-0 border-t border-border bg-card p-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Sub Total</span>
          <span>₹{totals.subTotal.toFixed(2)}</span>
        </div>
        
        {totals.discountAmount > 0 && (
          <div className="flex justify-between text-sm text-success">
            <span>
              Discount
              {discountType === 'percentage' && ` (${discountValue}%)`}
            </span>
            <span>-₹{totals.discountAmount.toFixed(2)}</span>
          </div>
        )}
        
        {isGstEnabled && (
          <>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>CGST</span>
              <span>₹{totals.cgstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>SGST</span>
              <span>₹{totals.sgstAmount.toFixed(2)}</span>
            </div>
          </>
        )}
        
        <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
          <span>Total</span>
          <span className="text-success">₹{finalTotal}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="shrink-0 p-3 bg-card border-t border-border grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleKOT}
        >
          <Printer className="h-4 w-4" />
          KOT
        </Button>
        <Button
          className="gap-2"
          onClick={() => setShowPayment(true)}
        >
          <CreditCard className="h-4 w-4" />
          Settle
        </Button>
      </div>

      {/* Payment Modal */}
      <PaymentModal 
        open={showPayment} 
        onClose={() => setShowPayment(false)}
        onPayment={handlePayment}
        onSaveUnsettled={handleSaveUnsettledBill}
        finalAmount={finalTotal}
      />

      {/* Discount Modal */}
      <DiscountModal
        open={showDiscount}
        onClose={() => setShowDiscount(false)}
        onApply={handleApplyDiscount}
        currentType={discountType}
        currentValue={discountValue}
        currentReason={discountReason}
        subTotal={totals.subTotal}
      />
    </div>
  );
}
