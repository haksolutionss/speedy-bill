import { useState, useRef, useEffect } from 'react';
import {
  Printer,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Split,
  Users,
  Percent,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore, calculateBillTotals } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useBillingOperations } from '@/hooks/useBillingOperations';
import { usePrint } from '@/hooks/usePrint';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { KOTTemplate } from '@/components/print/KOTTemplate';
import { BillTemplate } from '@/components/print/BillTemplate';
import { BillSummary } from './BillSummary';
import { DiscountModal } from './DiscountModal';
import { CustomerModal } from './CustomerModal';
import { SplitPaymentModal } from './SplitPaymentModal';
import type { KOTData, BillData } from '@/lib/escpos/templates';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyalty_points: number;
}

export function BillActions() {
  const {
    cart,
    markItemsSentToKitchen,
    currentBillId,
    selectedTable,
    isParcelMode,
    getKOTItems,
    discountType,
    discountValue,
    discountReason,
    setDiscount,
  } = useUIStore();

  const { settings, calculateLoyaltyPoints, calculateRedemptionValue } = useSettingsStore();
  const { printKOT, settleBill, saveOrUpdateBill } = useBillingOperations();
  const {
    printRef,
    print,
    printKOTDirect,
    printBillDirect,
    openCashDrawer,
    getBusinessInfo,
    formatCurrency,
    currencySymbol,
    gstMode,
    isElectron
  } = usePrint();

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showKOTPreview, setShowKOTPreview] = useState(false);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [totalAmountView, setTotalAmountView] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loyaltyPointsToUse, setLoyaltyPointsToUse] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);

  const kotRef = useRef<HTMLDivElement>(null);
  const billRef = useRef<HTMLDivElement>(null);

  // Get items that need to be printed (new items or added quantities only)
  const kotItems = getKOTItems();
  const hasPendingItems = kotItems.length > 0;
  const hasItems = cart.length > 0;

  // Calculate totals with discount and loyalty
  const loyaltyDiscount = calculateRedemptionValue(loyaltyPointsToUse);
  const totals = calculateBillTotals(cart, discountType, discountValue);
  const { subTotal, discountAmount, cgstAmount, sgstAmount, totalAmount } = totals;
  const finalAmount = Math.max(0, totals.finalAmount - loyaltyDiscount);

  // Get business info for bill
  const businessInfo = getBusinessInfo();

  // Calculate points customer will earn from this bill
  const pointsToEarn = calculateLoyaltyPoints(finalAmount);

  // Build KOT data for printing
  const buildKOTData = (): KOTData => ({
    tableNumber: selectedTable?.number,
    tokenNumber: isParcelMode ? Date.now() % 1000 : undefined,
    items: kotItems,
    billNumber: currentBillId?.slice(0, 8),
    kotNumber: 1,
    isParcel: isParcelMode,
  });

  // Build Bill data for printing
  const buildBillData = (): BillData => ({
    billNumber: currentBillId?.slice(0, 8) || 'BILL-0000',
    tableNumber: selectedTable?.number,
    tokenNumber: isParcelMode ? Date.now() % 1000 : undefined,
    items: cart,
    subTotal,
    discountAmount: discountAmount + loyaltyDiscount,
    discountType: discountType || undefined,
    discountValue: discountValue || undefined,
    discountReason: discountReason || undefined,
    cgstAmount,
    sgstAmount,
    totalAmount,
    finalAmount,
    isParcel: isParcelMode,
    restaurantName: businessInfo.name,
    address: businessInfo.address,
    phone: businessInfo.phone,
    gstin: businessInfo.gstNumber,
    currencySymbol,
    gstMode,
    customerName: selectedCustomer?.name,
    loyaltyPointsUsed: loyaltyPointsToUse,
    loyaltyPointsEarned: pointsToEarn,
  });

  // Keyboard shortcuts - F1 for direct KOT, F2 for direct Bill (no preview)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1 - Direct Print KOT (no preview)
      if (e.key === 'F1') {
        e.preventDefault();
        e.stopPropagation();

        if (hasPendingItems) {
          handleDirectPrintKOT();
        } else {
          toast.info('No new items to send to kitchen');
          console.log("No new items to send to kitchen");
        }
        return false;
      }

      // F2 - Direct Print Bill (no preview, use default payment method)
      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();

        if (hasItems) {
          handleDirectPrintBill();
        } else {
          toast.error('Add items to print bill');
        }
        return false;
      }
    };

    // Use capture phase to intercept before browser handles F1
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [hasPendingItems, hasItems, cart, kotItems]);

  // Direct print KOT without preview (F1) - Silent in Electron
  const handleDirectPrintKOT = async () => {
    if (!hasPendingItems || isPrinting) {
      if (!hasPendingItems) toast.info('No new items to send to kitchen');
      return;
    }

    setIsPrinting(true);
    try {
      // Send to kitchen database first
      await printKOT();

      // Print silently (Electron) or via browser
      const kotData = buildKOTData();
      const result = await printKOTDirect(kotData);

      if (result.success) {
        console.log(isElectron ? 'KOT printed to kitchen' : 'KOT sent to kitchen');
      } else if (result.error) {
        console.warn(`Print failed: ${result.error}`);
        console.log('Items sent to kitchen (print failed)');
      }
    } catch (error) {
      console.error('KOT print error:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  // Direct print Bill without preview (F2) - uses default payment method
  const handleDirectPrintBill = async () => {
    if (!hasItems || isPrinting) {
      if (!hasItems) toast.error('Add items to print bill');
      return;
    }

    setIsPrinting(true);
    try {
      // First send any pending items to kitchen
      if (hasPendingItems) {
        await printKOT();
      } else {
        await saveOrUpdateBill();
      }

      // Use default payment method from settings
      const defaultMethod = settings.billing.defaultPaymentMethod;

      // Print bill silently (Electron) or via browser
      const billData = buildBillData();
      billData.paymentMethod = defaultMethod;

      const result = await printBillDirect(billData);

      // Open cash drawer for cash payments (Electron only)
      if (defaultMethod === 'cash' && isElectron) {
        await openCashDrawer();
      }

      // Settle with default payment method
      await settleBill(defaultMethod, undefined, undefined, 0, finalAmount);

      if (result.success) {
        console.warn(`Bill settled with ${defaultMethod.toUpperCase()}`);
      } else {
        console.warn(`Bill settled (print: ${result.error || 'browser dialog'})`);
      }
    } catch (error) {
      console.error('Bill print error:', error);
      console.warn('Failed to settle bill');
    } finally {
      setIsPrinting(false);
    }
  };

  // Button click - show preview (for non-Electron or when preview desired)
  const handlePrintKOT = async () => {
    if (!hasPendingItems) {
      toast.info('No new items to send to kitchen');
      return;
    }

    // In Electron, skip preview and print directly
    if (isElectron) {
      await handleDirectPrintKOT();
      return;
    }

    setShowKOTPreview(true);
  };

  const confirmPrintKOT = async () => {
    await printKOT();

    // Print via browser fallback
    if (printRef.current) {
      print('kitchen');
    }

    setShowKOTPreview(false);
    toast.success('KOT sent to kitchen');
  };

  // Button click - show preview with customer/loyalty options
  const handlePrintBill = async () => {
    if (!hasItems) {
      toast.error('Add items to print bill');
      return;
    }

    await saveOrUpdateBill();

    setShowPaymentDialog(true);
  };

  const handlePayment = async (method: 'cash' | 'card' | 'upi') => {
    setShowPaymentDialog(false);
    setIsPrinting(true);

    try {
      // Build bill data with payment method
      const billData = buildBillData();
      billData.paymentMethod = method;

      // Print bill
      const result = await printBillDirect(billData);

      // Open cash drawer for cash payments (Electron only)
      if (method === 'cash' && isElectron) {
        await openCashDrawer();
      }

      // Settlement is optimistic - runs in background
      await settleBill(method, undefined, selectedCustomer?.id, loyaltyPointsToUse, finalAmount);

      if (!result.success && !isElectron) {
        setShowBillPreview(true);
      } else {
        console.log(`Bill paid with ${method.toUpperCase()}`);
      }
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setIsPrinting(false);
      setSelectedCustomer(null);
      setLoyaltyPointsToUse(0);
    }
  };

  const handleSplitPayment = async (payments: { method: 'cash' | 'card' | 'upi'; amount: number }[]) => {
    setShowSplitPayment(false);
    setShowPaymentDialog(false);
    setIsPrinting(true);

    try {
      // Build bill data
      const billData = buildBillData();
      billData.paymentMethod = 'Split';

      // Print bill
      const result = await printBillDirect(billData);

      // Open cash drawer if any cash payment (Electron only)
      if (payments.some(p => p.method === 'cash') && isElectron) {
        await openCashDrawer();
      }

      // Settlement
      await settleBill('split', payments, selectedCustomer?.id, loyaltyPointsToUse, finalAmount);

      if (!result.success && !isElectron) {
        setShowBillPreview(true);
      } else {
        console.log('Split payment completed');
      }
    } catch (error) {
      console.error('Split payment error:', error);
    } finally {
      setIsPrinting(false);
      setSelectedCustomer(null);
      setLoyaltyPointsToUse(0);
    }
  };

  const handleTotalAmountView = () => {
    setTotalAmountView(!totalAmountView);
  };

  const handleApplyDiscount = (
    type: 'percentage' | 'fixed' | null,
    value: number | null,
    reason: string | null
  ) => {
    setDiscount(type, value, reason);
  };

  const handleSelectCustomer = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    setLoyaltyPointsToUse(0);
  };

  const handleUseLoyaltyPoints = (points: number) => {
    if (selectedCustomer && points <= selectedCustomer.loyalty_points) {
      setLoyaltyPointsToUse(points);
    }
  };

  return (
    <>
      {totalAmountView && (
        <BillSummary />
      )}
      <div className="action-bar fixed bottom-0 bg-background right-0 w-[480px]">
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant='outline'
            onClick={() => setShowCustomerModal(true)}
            className={selectedCustomer ? 'border-accent text-accent' : ''}
          >
            <Users className="h-4 w-4 mr-1" />
            {selectedCustomer ? selectedCustomer.name.split(' ')[0] : 'Loyalty'}
          </Button>
          <Button
            variant='outline'
            onClick={() => setShowDiscountModal(true)}
            className={discountValue ? 'border-success text-success' : ''}
          >
            {discountValue ? (
              <>
                <Percent className="h-4 w-4 mr-1" />
                {discountType === 'percentage' ? `${discountValue}%` : `${currencySymbol}${discountValue}`}
              </>
            ) : (
              'Total'
            )}
          </Button>
          <Button
            onClick={handlePrintKOT}
            disabled={!hasPendingItems || isPrinting}
            variant="secondary"
            className="gap-1.5"
          >
            <Printer className="h-4 w-4" />
            KOT
            <kbd className="kbd ml-1">F1</kbd>
          </Button>
          <Button
            onClick={handlePrintBill}
            disabled={!hasItems || isPrinting}
            className="gap-1.5 bg-success hover:bg-success/90"
          >
            <Receipt className="h-4 w-4" />
            Bill
            <kbd className="kbd ml-1 bg-success-foreground/20 border-success-foreground/30 text-success-foreground">F2</kbd>
          </Button>
        </div>
      </div>

      {/* Discount Modal */}
      <DiscountModal
        open={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        onApply={handleApplyDiscount}
        currentType={discountType}
        currentValue={discountValue}
        currentReason={discountReason}
        subTotal={subTotal}
      />

      {/* Customer Modal - with loyalty integration */}
      <CustomerModal
        open={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelect={handleSelectCustomer}
        currentCustomer={selectedCustomer}
        billAmount={finalAmount}
        onUseLoyaltyPoints={handleUseLoyaltyPoints}
        loyaltyPointsToUse={loyaltyPointsToUse}
      />

      {/* KOT Preview Dialog (Browser fallback only) */}
      <Dialog open={showKOTPreview} onOpenChange={setShowKOTPreview}>
        <DialogContent className="sm:max-w-max max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>KOT Preview</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden" ref={printRef}>
            <KOTTemplate
              ref={kotRef}
              tableNumber={selectedTable?.number}
              items={kotItems}
              isParcel={isParcelMode}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowKOTPreview(false)}>
              Cancel
            </Button>
            <Button onClick={confirmPrintKOT} className="gap-2">
              <Printer className="h-4 w-4" />
              Print & Send to Kitchen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bill Preview Dialog (Browser fallback only) */}
      <Dialog open={showBillPreview} onOpenChange={setShowBillPreview}>
        <DialogContent className="sm:max-w-max max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill Preview</DialogTitle>
          </DialogHeader>
          <div className="bg-white rounded-lg overflow-hidden" ref={printRef}>
            <BillTemplate
              ref={billRef}
              billNumber={currentBillId?.slice(0, 8) || 'BILL-0000'}
              tableNumber={selectedTable?.number}
              items={cart}
              subTotal={subTotal}
              discountAmount={discountAmount + loyaltyDiscount}
              cgstAmount={cgstAmount}
              sgstAmount={sgstAmount}
              totalAmount={totalAmount}
              finalAmount={finalAmount}
              isParcel={isParcelMode}
              restaurantName={businessInfo.name}
              address={businessInfo.address}
              phone={businessInfo.phone}
              gstin={businessInfo.gstNumber}
              currencySymbol={currencySymbol}
              gstMode={gstMode}
              customerName={selectedCustomer?.name}
              loyaltyPointsUsed={loyaltyPointsToUse}
              loyaltyPointsEarned={pointsToEarn}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowBillPreview(false)}>
              Close
            </Button>
            <Button onClick={() => { print('counter'); setShowBillPreview(false); }} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Bill
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Payment Method</DialogTitle>
          </DialogHeader>

          {/* Customer & Loyalty Info */}
          {selectedCustomer && (
            <div className="p-3 bg-muted rounded-lg mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{selectedCustomer.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">Available Points: <span className="font-medium">{selectedCustomer.loyalty_points}</span></p>
                  {loyaltyPointsToUse > 0 && (
                    <p className="text-sm text-success">Using: {loyaltyPointsToUse} pts ({currencySymbol}{loyaltyDiscount})</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="text-center mb-4">
            <span className="text-3xl font-bold text-success">{currencySymbol}{finalAmount.toFixed(2)}</span>
            {loyaltyDiscount > 0 && (
              <p className="text-sm text-muted-foreground">
                (After {currencySymbol}{loyaltyDiscount} loyalty discount)
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 gap-4 py-4">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 hover:bg-success/10 hover:border-success hover:text-success"
              onClick={() => handlePayment('cash')}
              disabled={isPrinting}
            >
              <Banknote className="h-8 w-8" />
              <span>Cash</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 hover:bg-blue-500/10 hover:border-blue-500 hover:text-blue-400"
              onClick={() => handlePayment('card')}
              disabled={isPrinting}
            >
              <CreditCard className="h-8 w-8" />
              <span>Card</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 hover:bg-purple-500/10 hover:border-purple-500 hover:text-purple-400"
              onClick={() => handlePayment('upi')}
              disabled={isPrinting}
            >
              <Smartphone className="h-8 w-8" />
              <span>UPI</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 hover:bg-orange-500/10 hover:border-orange-500 hover:text-orange-400"
              onClick={() => {
                setShowPaymentDialog(false);
                setShowSplitPayment(true);
              }}
              disabled={isPrinting}
            >
              <Split className="h-8 w-8" />
              <span>Split</span>
            </Button>
          </div>

          {/* Points to be earned */}
          {settings.loyalty.enabled && pointsToEarn > 0 && (
            <p className="text-center text-sm text-muted-foreground">
              {selectedCustomer ? `${selectedCustomer.name} will` : 'Customer can'} earn <span className="font-medium text-accent">{pointsToEarn} points</span> on this bill
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Split Payment Modal */}
      <SplitPaymentModal
        open={showSplitPayment}
        onClose={() => setShowSplitPayment(false)}
        onConfirm={handleSplitPayment}
        finalAmount={finalAmount}
      />
    </>
  );
}
