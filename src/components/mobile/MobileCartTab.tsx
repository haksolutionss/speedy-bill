import { useState, useMemo } from 'react';
import { Minus, Plus, Trash2, Printer, CreditCard, ShoppingCart, ChefHat, Loader2, ArrowLeft, Users, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useBillingOperations } from '@/hooks/useBillingOperations';
import { usePrint } from '@/hooks/usePrint';
import { useCartSync } from '@/hooks/useCartSync';
import { calculateBillTotals } from '@/lib/billCalculations';
import { cn } from '@/lib/utils';
import { PaymentModal } from '@/components/billing/PaymentModal';
import { CustomerModal } from '@/components/billing/CustomerModal';
import { DiscountModal } from '@/components/billing/DiscountModal';
import { toast } from 'sonner';
import { getNextKOTNumber } from '@/lib/kotNumberManager';
import type { KOTData, BillData } from '@/lib/escpos/templates';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyalty_points: number;
}

interface MobileCartTabProps {
  onBack?: () => void;
}

export function MobileCartTab({ onBack }: MobileCartTabProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [isPrintingKOT, setIsPrintingKOT] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loyaltyPointsToUse, setLoyaltyPointsToUse] = useState(0);

  const {
    cart,
    selectedTable,
    isParcelMode,
    discountType,
    discountValue,
    discountReason,
    setDiscount,
    updateCartItem,
    removeFromCart,
    currentBillId,
    getKOTItems,
    incrementBillNumber,
  } = useUIStore();

  const { settings, calculateLoyaltyPoints, calculateRedemptionValue } = useSettingsStore();
  const { printKOT: printKOTOps, settleBill, saveOrUpdateBill } = useBillingOperations();
  const { printKOT: printKOTDirect, printBill: printBillDirect, getBusinessInfo, currencySymbol: printCurrencySymbol, gstMode } = usePrint();
  const { clearCartFromSupabase } = useCartSync();

  const taxType = settings.tax.type;
  const currencySymbol = settings.currency.symbol;
  const loyaltyEnabled = settings.loyalty?.enabled ?? false;

  // Calculate loyalty discount
  const loyaltyDiscount = calculateRedemptionValue(loyaltyPointsToUse);

  const totals = useMemo(() => {
    const baseTotals = calculateBillTotals(cart, discountType, discountValue, taxType);
    return {
      ...baseTotals,
      loyaltyDiscount,
      adjustedFinalAmount: Math.max(0, baseTotals.finalAmount - loyaltyDiscount),
    };
  }, [cart, discountType, discountValue, taxType, loyaltyDiscount]);

  // Points that will be earned on this bill
  const pointsToEarn = calculateLoyaltyPoints(totals.adjustedFinalAmount);

  const kotItems = getKOTItems();
  const hasKOTItems = kotItems.length > 0;
  const isTableSelected = selectedTable || isParcelMode;
  const hasItems = cart.length > 0;

  const handleQuantityChange = (itemId: string, newQty: number, isSent: boolean, printedQty: number) => {
    if (isSent && newQty <= printedQty) return;
    if (newQty <= 0) {
      if (!isSent) removeFromCart(itemId);
      return;
    }
    updateCartItem(itemId, { quantity: newQty });
  };

  // Build KOT data for printing
  const buildKOTData = (billId: string): KOTData & { billId: string } => {
    const kotNumber = getNextKOTNumber();
    return {
      billId,
      tableNumber: selectedTable?.number,
      tokenNumber: isParcelMode ? Date.now() % 1000 : undefined,
      items: kotItems,
      billNumber: billId.slice(0, 8),
      kotNumber: parseInt(kotNumber, 10),
      kotNumberFormatted: kotNumber,
      isParcel: isParcelMode,
    };
  };

  // Build Bill data for printing
  const buildBillData = (billId: string): BillData => {
    const businessInfo = getBusinessInfo();
    return {
      billId,
      billNumber: currentBillId?.slice(0, 8) || 'BILL-0000',
      tableNumber: selectedTable?.number,
      tokenNumber: isParcelMode ? Date.now() % 1000 : undefined,
      items: cart,
      subTotal: totals.subTotal,
      discountAmount: totals.discountAmount,
      discountType: discountType || undefined,
      discountValue: discountValue || undefined,
      discountReason: discountReason || undefined,
      cgstAmount: taxType === 'gst' ? totals.cgstAmount : 0,
      sgstAmount: taxType === 'gst' ? totals.sgstAmount : 0,
      totalAmount: totals.totalAmount,
      finalAmount: totals.adjustedFinalAmount,
      isParcel: isParcelMode,
      restaurantName: businessInfo.name,
      address: businessInfo.address,
      phone: businessInfo.phone,
      gstin: taxType === 'gst' ? businessInfo.gstNumber : undefined,
      currencySymbol: printCurrencySymbol,
      gstMode,
      showGST: taxType === 'gst',
      customerName: selectedCustomer?.name,
      loyaltyPointsUsed: loyaltyPointsToUse,
      loyaltyPointsEarned: pointsToEarn,
    };
  };

  const handlePrintKOT = async () => {
    if (!hasKOTItems) {
      toast.info('No new items to print');
      return;
    }
    setIsPrintingKOT(true);
    try {
      // First save/update the bill to get billId
      const billId = await printKOTOps();

      if (billId) {
        // Now queue the KOT print job with billId
        const kotData = buildKOTData(billId);
        await printKOTDirect(kotData);
      }
    } catch (error) {
      console.error('KOT print error:', error);
      toast.error('Failed to print KOT');
    } finally {
      setIsPrintingKOT(false);
    }
  };

  const handlePayment = async (method: 'cash' | 'card' | 'upi') => {
    setIsProcessingPayment(true);
    try {
      // Ensure bill exists first
      let billId = currentBillId;
      if (!billId) {
        billId = await saveOrUpdateBill();
      }

      if (!billId) {
        toast.error('Failed to create bill');
        return;
      }

      // Build and send bill print job
      const billData = buildBillData(billId);
      billData.paymentMethod = method;

      const printResult = await printBillDirect(billData);

      if (printResult.success) {
        // Settle the bill with customer and loyalty info
        await settleBill(
          method,
          undefined,
          selectedCustomer?.id,
          loyaltyPointsToUse,
          totals.adjustedFinalAmount
        );

        // Clear cart from Supabase cart_items table
        if (selectedTable?.id) {
          await clearCartFromSupabase(selectedTable.id);
        }

        setShowPaymentModal(false);
        toast.success('Payment completed successfully');
      } else if (printResult.error) {
        toast.error(`Print failed: ${printResult.error}`);
      }
    } catch (error) {
      console.error('Settlement error:', error);
      toast.error('Payment failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSaveUnsettled = () => {
    setShowPaymentModal(false);
    toast.info('Bill saved as unsettled');
  };

  // Customer modal handlers
  const handleSelectCustomer = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    if (!customer) {
      setLoyaltyPointsToUse(0);
    }
  };

  const handleUseLoyaltyPoints = (points: number) => {
    if (selectedCustomer && points <= selectedCustomer.loyalty_points) {
      setLoyaltyPointsToUse(points);
    }
  };

  // Discount modal handler
  const handleApplyDiscount = (
    type: 'percentage' | 'fixed' | null,
    value: number | null,
    reason: string | null
  ) => {
    setDiscount(type, value, reason);
    setShowDiscountModal(false);
  };

  // Empty state - no table selected
  if (!isTableSelected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <ShoppingCart className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Active Order</h3>
        <p className="text-sm text-muted-foreground">
          Select a table or start a parcel order to begin billing.
        </p>
      </div>
    );
  }

  // Empty cart state
  if (cart.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <ShoppingCart className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Cart is Empty</h3>
        <p className="text-sm text-muted-foreground">
          Add products from the Products tab to start your order.
        </p>
      </div>
    );
  }

  const sentItems = cart.filter((item) => item.sentToKitchen);
  const pendingItems = cart.filter((item) => !item.sentToKitchen);

  return (
    <div className="flex flex-col h-full relative">
      {/* Back Button Header - Only show when we have items */}
      {onBack && hasItems && (
        <div className="fixed top-0 w-full z-50 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left */}
            <button onClick={onBack} className="px-2">
              <ArrowLeft size={20} />
            </button>

            {/* Center */}
            <div className="text-center">
              <h2 className="text-base font-semibold">
                {isParcelMode ? 'Parcel Order' : `Table ${selectedTable?.number}`}
              </h2>
              <p className="text-xs text-muted-foreground">
                {cart.length} item{cart.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Right */}
            <div className="text-right">
              <p className="text-lg font-bold text-success">
                {currencySymbol}{totals.adjustedFinalAmount}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Customer & Discount Bar */}
      {selectedCustomer && loyaltyEnabled && selectedCustomer.loyalty_points > 0 && (
        <div className='fixed top-14 w-full z-50 bg-card border-b border-border px-4 py-2'>
          {/* Loyalty Points Usage - Show if customer has points */}
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Use Loyalty Points</p>
                <p className="text-xs text-muted-foreground">
                  Available: {selectedCustomer.loyalty_points} pts
                  ({currencySymbol}{calculateRedemptionValue(selectedCustomer.loyalty_points)})
                </p>
              </div>
              {loyaltyPointsToUse > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLoyaltyPointsToUse(0)}
                  className="text-destructive border-destructive"
                >
                  Remove ({currencySymbol}{loyaltyDiscount})
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    // Use maximum points that don't exceed bill amount
                    const redemptionValue = settings.loyalty?.redemptionValue || 1;
                    const maxRedeemable = Math.floor(totals.finalAmount / redemptionValue);
                    const pointsToUse = Math.min(selectedCustomer.loyalty_points, maxRedeemable);
                    setLoyaltyPointsToUse(pointsToUse);
                  }}
                  className="bg-accent hover:bg-accent/90"
                >
                  Use All
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cart Items - Scrollable area */}
      <div className={`flex-1 min-h-0 overflow-y-auto ${selectedCustomer && loyaltyEnabled && selectedCustomer.loyalty_points ? 'pt-24' : 'pt-4'} pb-44`}>
        <div className="p-2 space-y-3">


          {/* Sent Items */}
          {sentItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <ChefHat className="h-3 w-3" />
                Sent to Kitchen ({sentItems.length})
              </p>
              {sentItems.map((item) => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  currencySymbol={currencySymbol}
                  onQuantityChange={handleQuantityChange}
                  onRemove={removeFromCart}
                />
              ))}
            </div>
          )}

          {/* Pending Items */}
          {pendingItems.length > 0 && (
            <div className="space-y-2">
              {sentItems.length > 0 && (
                <p className="text-xs text-muted-foreground font-medium mt-4">
                  Pending ({pendingItems.length})
                </p>
              )}
              {pendingItems.map((item) => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  currencySymbol={currencySymbol}
                  onQuantityChange={handleQuantityChange}
                  onRemove={removeFromCart}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Section */}
      <div className="fixed bottom-0 w-full shrink-0 border-t border-border bg-card">
        <div className="flex gap-2 p-2">

          <button
            onClick={() => setShowCustomerModal(true)}
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg border transition-colors",
              selectedCustomer
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-card"
            )}
          >
            <Users className="h-4 w-4" />
          </button>

          <button
            onClick={() => setShowDiscountModal(true)}
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg border transition-colors",
              discountValue
                ? "border-warning bg-warning/10 text-warning"
                : "border-border bg-card"
            )}
          >
            <Percent className="h-4 w-4" />
            <div className="text-left flex-1 min-w-0">
              <p className="text-sm font-medium">
                {discountValue
                  ? discountType === 'percentage'
                    ? `${discountValue}% off`
                    : `${currencySymbol}${discountValue} off`
                  : ''}
              </p>
            </div>
          </button>

          <Button
            variant="outline"
            className="flex-1 h-14 text-base"
            onClick={handlePrintKOT}
            disabled={isPrintingKOT || !hasKOTItems}
          >
            {isPrintingKOT ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Printer className="h-5 w-5 mr-2" />
                KOT
              </>
            )}
          </Button>
          <Button
            className="flex-1 h-14 text-base"
            onClick={() => setShowPaymentModal(true)}
            disabled={cart.length === 0 || isProcessingPayment}
          >
            {isProcessingPayment ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 mr-2" />
                Pay
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Processing Overlay */}
      {isProcessingPayment && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Processing Payment</h3>
              <p className="text-sm text-muted-foreground">Sending bill to printer...</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        open={showPaymentModal && !isProcessingPayment}
        onClose={() => setShowPaymentModal(false)}
        onPayment={handlePayment}
        onSaveUnsettled={handleSaveUnsettled}
        finalAmount={totals.adjustedFinalAmount}
        showNotNow={true}
        showSplit={false}
        isProcessing={isProcessingPayment}
      />

      {/* Customer Modal */}
      <CustomerModal
        open={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        currentCustomer={selectedCustomer}
        onSelect={handleSelectCustomer}
        loyaltyPointsToUse={loyaltyPointsToUse}
        onUseLoyaltyPoints={handleUseLoyaltyPoints}
        billAmount={totals.finalAmount}
      />

      {/* Discount Modal */}
      <DiscountModal
        open={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        currentType={discountType}
        currentValue={discountValue}
        currentReason={discountReason}
        onApply={handleApplyDiscount}
        subTotal={totals.subTotal}
      />
    </div>
  );
}

// Cart Item Card Component
interface CartItemCardProps {
  item: {
    id: string;
    productName: string;
    productCode: string;
    portion: string;
    quantity: number;
    unitPrice: number;
    sentToKitchen: boolean;
    printedQuantity: number;
  };
  currencySymbol: string;
  onQuantityChange: (id: string, qty: number, sent: boolean, printed: number) => void;
  onRemove: (id: string) => void;
}

function CartItemCard({ item, currencySymbol, onQuantityChange, onRemove }: CartItemCardProps) {
  const isSent = item.sentToKitchen;
  const canDecrease = !isSent || item.quantity > item.printedQuantity;

  return (
    <div className={cn(
      "bg-card border border-border rounded-xl p-3",
      isSent && "opacity-80 bg-muted/30"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{item.productCode}</span>
            <span className="font-medium truncate">{item.productName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
            <span className="capitalize">{item.portion}</span>
            <span>×</span>
            <span>{currencySymbol}{item.unitPrice}</span>
          </div>
        </div>
        <span className="text-success font-semibold shrink-0">
          {currencySymbol}{(item.unitPrice * item.quantity).toFixed(2)}
        </span>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => onQuantityChange(item.id, item.quantity - 1, isSent, item.printedQuantity)}
            disabled={!canDecrease}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-10 text-center font-medium">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => onQuantityChange(item.id, item.quantity + 1, isSent, item.printedQuantity)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {!isSent && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:text-destructive"
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}