import { Banknote, CreditCard, Smartphone, Split } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Customer {
  id: string;
  name: string;
  phone: string;
  loyalty_points: number;
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finalAmount: number;
  currencySymbol: string;
  isPrinting: boolean;
  selectedCustomer: Customer | null;
  loyaltyPointsToUse: number;
  loyaltyDiscount: number;
  pointsToEarn: number;
  loyaltyEnabled: boolean;
  onPayment: (method: 'cash' | 'card' | 'upi') => void;
  onOpenSplitPayment: () => void;
}

export function PaymentDialog({
  open,
  onOpenChange,
  finalAmount,
  currencySymbol,
  isPrinting,
  selectedCustomer,
  loyaltyPointsToUse,
  loyaltyDiscount,
  pointsToEarn,
  loyaltyEnabled,
  onPayment,
  onOpenSplitPayment,
}: PaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Payment Method</DialogTitle>
        </DialogHeader>

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
            onClick={() => onPayment('cash')}
            disabled={isPrinting}
          >
            <Banknote className="h-8 w-8" />
            <span>Cash</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 hover:bg-primary/10 hover:border-primary hover:text-primary"
            onClick={() => onPayment('card')}
            disabled={isPrinting}
          >
            <CreditCard className="h-8 w-8" />
            <span>Card</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 hover:bg-accent/10 hover:border-accent hover:text-accent"
            onClick={() => onPayment('upi')}
            disabled={isPrinting}
          >
            <Smartphone className="h-8 w-8" />
            <span>UPI</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 hover:bg-warning/10 hover:border-warning hover:text-warning"
            onClick={onOpenSplitPayment}
            disabled={isPrinting}
          >
            <Split className="h-8 w-8" />
            <span>Split</span>
          </Button>
        </div>

        {loyaltyEnabled && pointsToEarn > 0 && (
          <p className="text-center text-sm text-muted-foreground">
            {selectedCustomer ? `${selectedCustomer.name} will` : 'Customer can'} earn <span className="font-medium text-accent">{pointsToEarn} points</span> on this bill
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
