import { useState } from 'react';
import { 
  Printer, 
  Receipt, 
  ArrowRightLeft, 
  Merge, 
  Save, 
  RotateCcw, 
  Eye,
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

export function BillActions() {
  const { 
    cart, 
    markItemsSentToKitchen, 
    settleBill, 
    saveAsUnsettled,
    createNewBill 
  } = useBillingStore();
  
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  
  const pendingItems = cart.filter(item => !item.sentToKitchen);
  const hasPendingItems = pendingItems.length > 0;
  const hasItems = cart.length > 0;
  
  const handlePrintKOT = () => {
    if (!hasPendingItems) {
      toast.info('No new items to send to kitchen');
      return;
    }
    
    markItemsSentToKitchen();
    createNewBill();
    toast.success(`KOT sent: ${pendingItems.length} item(s)`, {
      description: 'Items marked for kitchen preparation',
    });
    
    // Here you would trigger actual print
    // For now, we'll just show the toast
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
    settleBill(method);
    setShowPaymentDialog(false);
    toast.success('Bill settled successfully!', {
      description: `Payment received via ${method.toUpperCase()}`,
    });
  };
  
  const handleSaveUnsettled = () => {
    if (!hasItems) {
      toast.error('Add items first');
      return;
    }
    
    saveAsUnsettled();
    toast.info('Bill saved as unsettled', {
      description: 'You can retrieve it from Bill History',
    });
  };
  
  return (
    <>
      <div className="action-bar flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" disabled className="gap-1.5">
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Transfer
          </Button>
          <Button variant="outline" size="sm" disabled className="gap-1.5">
            <Merge className="h-3.5 w-3.5" />
            Merge
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSaveUnsettled}
            disabled={!hasItems}
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            Unsettled
          </Button>
          <Button variant="outline" size="sm" disabled className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
          <Button variant="outline" size="sm" disabled className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Revert
          </Button>
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
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
      
      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Payment Method</DialogTitle>
          </DialogHeader>
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
