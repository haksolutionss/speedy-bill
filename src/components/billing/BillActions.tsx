import { useState, useRef, useEffect } from 'react';
import {
  Printer,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/uiStore';
import { useBillingOperations } from '@/hooks/useBillingOperations';
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

export function BillActions() {
  const {
    cart,
    markItemsSentToKitchen,
    currentBillId,
    selectedTable,
    isParcelMode,
    getKOTItems,
  } = useUIStore();

  const { printKOT, settleBill, saveOrUpdateBill } = useBillingOperations();

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showKOTPreview, setShowKOTPreview] = useState(false);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [totalAmountView, setTotalAmountView] = useState(false);
  const kotRef = useRef<HTMLDivElement>(null);
  const billRef = useRef<HTMLDivElement>(null);

  // Get items that need to be printed (new items or added quantities only)
  const kotItems = getKOTItems();
  const hasPendingItems = kotItems.length > 0;
  const hasItems = cart.length > 0;

  // Calculate totals for bill template
  const subTotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const gstByRate: Record<number, number> = {};
  cart.forEach(item => {
    const itemTotal = item.unitPrice * item.quantity;
    const gst = itemTotal * (item.gstRate / 100);
    gstByRate[item.gstRate] = (gstByRate[item.gstRate] || 0) + gst;
  });
  const totalGst = Object.values(gstByRate).reduce((sum, gst) => sum + gst, 0);
  const cgstAmount = totalGst / 2;
  const sgstAmount = totalGst / 2;
  const totalAmount = subTotal + totalGst;
  const finalAmount = Math.round(totalAmount);

  // Keyboard shortcuts - F1 for KOT, F2 for Bill
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1 - Print KOT
      if (e.key === 'F1') {
        e.preventDefault();
        e.stopPropagation();
        
        if (hasPendingItems) {
          setShowKOTPreview(true);
        } else {
          toast.info('No new items to send to kitchen');
        }
        return false;
      }

      // F2 - Print Bill
      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        
        if (hasItems) {
          handlePrintBill();
        } else {
          toast.error('Add items to print bill');
        }
        return false;
      }
    };

    // Use capture phase to intercept before browser handles F1
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [hasPendingItems, hasItems, cart]);

  const handlePrintKOT = () => {
    if (!hasPendingItems) {
      toast.info('No new items to send to kitchen');
      return;
    }

    setShowKOTPreview(true);
  };

  const confirmPrintKOT = async () => {
    await printKOT();
    setShowKOTPreview(false);
  };

  const handlePrintBill = async () => {
    if (!hasItems) {
      toast.error('Add items to print bill');
      return;
    }

    // First send any pending items to kitchen
    if (hasPendingItems) {
      await printKOT();
    } else {
      await saveOrUpdateBill();
    }

    setShowPaymentDialog(true);
  };

  const handlePayment = async (method: 'cash' | 'card' | 'upi') => {
    setShowPaymentDialog(false);
    setShowBillPreview(true);

    // Delay settlement to allow print
    setTimeout(async () => {
      await settleBill(method);
      setShowBillPreview(false);
    }, 100);
  };

  const handleTotalAmountView = () => {
    setTotalAmountView(!totalAmountView);
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
          >
            Loyalty
          </Button>
          <Button
            variant='outline'
            onClick={handleTotalAmountView}
          >
            Total
          </Button>
          <Button
            onClick={handlePrintKOT}
            disabled={!hasPendingItems}
            variant="secondary"
            className="gap-1.5"
          >
            <Printer className="h-4 w-4" />
            KOT
            <kbd className="kbd ml-1">F1</kbd>
          </Button>
          <Button
            onClick={handlePrintBill}
            disabled={!hasItems}
            className="gap-1.5 bg-success hover:bg-success/90"
          >
            <Receipt className="h-4 w-4" />
            Bill
            <kbd className="kbd ml-1 bg-success-foreground/20 border-success-foreground/30 text-success-foreground">F2</kbd>
          </Button>
        </div>
      </div>

      {/* KOT Preview Dialog */}
      <Dialog open={showKOTPreview} onOpenChange={setShowKOTPreview}>
        <DialogContent className="sm:max-w-max max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>KOT Preview</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden">
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

      {/* Bill Preview Dialog */}
      <Dialog open={showBillPreview} onOpenChange={setShowBillPreview}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill Preview</DialogTitle>
          </DialogHeader>
          <div className="bg-white rounded-lg overflow-hidden">
            <BillTemplate
              ref={billRef}
              billNumber={currentBillId?.slice(0, 8) || 'BILL-0000'}
              tableNumber={selectedTable?.number}
              items={cart}
              subTotal={subTotal}
              discountAmount={0}
              cgstAmount={cgstAmount}
              sgstAmount={sgstAmount}
              totalAmount={totalAmount}
              finalAmount={finalAmount}
              isParcel={isParcelMode}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Payment Method</DialogTitle>
          </DialogHeader>
          <div className="text-center mb-4">
            <span className="text-3xl font-bold text-success">₹{finalAmount}</span>
          </div>
          <div className="grid grid-cols-3 gap-4 py-4">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 hover:bg-success/10 hover:border-success hover:text-success"
              onClick={() => handlePayment('cash')}
            >
              <Banknote className="h-8 w-8" />
              <span>Cash</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 hover:bg-blue-500/10 hover:border-blue-500 hover:text-blue-400"
              onClick={() => handlePayment('card')}
            >
              <CreditCard className="h-8 w-8" />
              <span>Card</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 hover:bg-purple-500/10 hover:border-purple-500 hover:text-purple-400"
              onClick={() => handlePayment('upi')}
            >
              <Smartphone className="h-8 w-8" />
              <span>UPI</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
