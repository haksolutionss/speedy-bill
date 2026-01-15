import {
  CreditCard,
  Banknote,
  Smartphone,
  Clock,
  Split,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onPayment: (method: 'cash' | 'card' | 'upi') => void;
  onSaveUnsettled: () => void;
  onSplitPayment?: () => void;
  finalAmount: number;
  showNotNow?: boolean;
  showSplit?: boolean;
}

export function PaymentModal({
  open,
  onClose,
  onPayment,
  onSaveUnsettled,
  onSplitPayment,
  finalAmount,
  showNotNow = true,
  showSplit = true,
}: PaymentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-max">
        <DialogHeader>
          <DialogTitle>Select Payment Method</DialogTitle>
        </DialogHeader>

        <div className="text-center mb-4">
          <span className="text-3xl font-bold text-success">
            ₹{finalAmount.toLocaleString('en-IN')}
          </span>
        </div>

        <div className={`grid gap-4 py-4 ${showSplit ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 hover:bg-success/10 hover:border-success hover:text-success"
            onClick={() => onPayment('cash')}
          >
            <Banknote className="h-8 w-8" />
            <span>Cash</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 hover:bg-blue-500/10 hover:border-blue-500 hover:text-blue-400"
            onClick={() => onPayment('card')}
          >
            <CreditCard className="h-8 w-8" />
            <span>Card</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 hover:bg-purple-500/10 hover:border-purple-500 hover:text-purple-400"
            onClick={() => onPayment('upi')}
          >
            <Smartphone className="h-8 w-8" />
            <span>UPI</span>
          </Button>
          {showSplit && onSplitPayment && (
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 hover:bg-orange-500/10 hover:border-orange-500 hover:text-orange-400"
              onClick={onSplitPayment}
            >
              <Split className="h-8 w-8" />
              <span>Split</span>
            </Button>
          )}
        </div>

        {showNotNow && (
          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button
              variant="ghost"
              onClick={onSaveUnsettled}
              className="flex-1"
            >
              <Clock className="h-4 w-4 mr-2" />
              Not Now
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
