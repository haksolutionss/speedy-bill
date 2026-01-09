import { useState, useRef } from 'react';
import {
  Printer,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBillingStore } from '@/store/billingStore';
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
    settleBill,
    createNewBill,
    currentBill,
    selectedTable,
    isParcelMode,
  } = useBillingStore();

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showKOTPreview, setShowKOTPreview] = useState(false);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [totalAmountView, setTotalAmountView] = useState(false)
  const kotRef = useRef<HTMLDivElement>(null);
  const billRef = useRef<HTMLDivElement>(null);

  const pendingItems = cart.filter(item => !item.sentToKitchen);
  const hasPendingItems = pendingItems.length > 0;
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

  const handlePrintKOT = () => {
    if (!hasPendingItems) {
      toast.info('No new items to send to kitchen');
      return;
    }

    setShowKOTPreview(true);
  };

  const confirmPrintKOT = () => {
    markItemsSentToKitchen();
    createNewBill();

    // Trigger print
    const printContent = kotRef.current;
    if (printContent) {
      const printWindow = window.open('', '_blank', 'width=320,height=600');
      if (printWindow) {
        printWindow.document.write('<html><head><title>KOT</title></head><body>');
        printWindow.document.write(printContent.outerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
    }

    setShowKOTPreview(false);
    toast.success(`KOT sent: ${pendingItems.length} item(s)`, {
      description: 'Items marked for kitchen preparation',
    });
  };

  const handlePrintBill = () => {
    if (!hasItems) {
      toast.error('Add items to print bill');
      return;
    }

    // First send any pending items to kitchen
    if (hasPendingItems) {
      markItemsSentToKitchen();
    }

    createNewBill();
    setShowPaymentDialog(true);
  };

  const handlePayment = (method: 'cash' | 'card' | 'upi') => {
    // Show bill preview first
    setShowPaymentDialog(false);
    setShowBillPreview(true);

    // Delay settlement to allow print
    setTimeout(() => {
      settleBill(method);
      setShowBillPreview(false);

      // Trigger print
      const printContent = billRef.current;
      if (printContent) {
        const printWindow = window.open('', '_blank', 'width=320,height=800');
        if (printWindow) {
          printWindow.document.write('<html><head><title>Bill</title></head><body>');
          printWindow.document.write(printContent.outerHTML);
          printWindow.document.write('</body></html>');
          printWindow.document.close();
          printWindow.print();
          printWindow.close();
        }
      }

      toast.success('Bill settled successfully!', {
        description: `Payment received via ${method.toUpperCase()}`,
      });
    }, 100);
  };

  const handleTotalAmountView = () => {
    setTotalAmountView(!totalAmountView)
  }
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
              tokenNumber={currentBill?.tokenNumber}
              items={pendingItems}
              billNumber={currentBill?.billNumber}
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
              billNumber={currentBill?.billNumber || 'BILL-0000'}
              tableNumber={selectedTable?.number}
              tokenNumber={currentBill?.tokenNumber}
              items={cart}
              subTotal={subTotal}
              discountAmount={currentBill?.discountAmount || 0}
              discountType={currentBill?.discountType}
              discountValue={currentBill?.discountValue}
              discountReason={currentBill?.discountReason}
              cgstAmount={cgstAmount}
              sgstAmount={sgstAmount}
              totalAmount={totalAmount}
              finalAmount={finalAmount}
              isParcel={isParcelMode}
              coverCount={currentBill?.coverCount}
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
