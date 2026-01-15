import { useState, useEffect } from 'react';
import {
  CreditCard,
  Banknote,
  Smartphone,
  Plus,
  X,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface PaymentEntry {
  id: string;
  method: 'cash' | 'card' | 'upi';
  amount: number;
}

interface SplitPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payments: { method: 'cash' | 'card' | 'upi'; amount: number }[]) => void;
  finalAmount: number;
}

const methodIcons = {
  cash: Banknote,
  card: CreditCard,
  upi: Smartphone,
};

const methodColors = {
  cash: 'text-success border-success bg-success/10',
  card: 'text-blue-400 border-blue-400 bg-blue-400/10',
  upi: 'text-purple-400 border-purple-400 bg-purple-400/10',
};

export function SplitPaymentModal({
  open,
  onClose,
  onConfirm,
  finalAmount,
}: SplitPaymentModalProps) {
  const [payments, setPayments] = useState<PaymentEntry[]>([
    { id: crypto.randomUUID(), method: 'cash', amount: 0 },
  ]);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setPayments([{ id: crypto.randomUUID(), method: 'cash', amount: finalAmount }]);
    }
  }, [open, finalAmount]);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = finalAmount - totalPaid;
  const isValid = Math.abs(remaining) < 1; // Allow for rounding

  const addPayment = () => {
    setPayments([
      ...payments,
      { id: crypto.randomUUID(), method: 'cash', amount: Math.max(0, remaining) },
    ]);
  };

  const removePayment = (id: string) => {
    if (payments.length > 1) {
      setPayments(payments.filter((p) => p.id !== id));
    }
  };

  const updatePayment = (id: string, updates: Partial<PaymentEntry>) => {
    setPayments(payments.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const handleConfirm = () => {
    const validPayments = payments
      .filter((p) => p.amount > 0)
      .map(({ method, amount }) => ({ method, amount }));
    onConfirm(validPayments);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Split Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Total Amount */}
          <div className="text-center p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Total Amount</span>
            <p className="text-2xl font-bold">₹{finalAmount.toLocaleString('en-IN')}</p>
          </div>

          {/* Payment Entries */}
          <div className="space-y-3">
            <Label>Payment Methods</Label>
            {payments.map((payment, index) => {
              const Icon = methodIcons[payment.method];
              return (
                <div key={payment.id} className="flex items-center gap-2">
                  {/* Method Selection */}
                  <div className="flex gap-1">
                    {(['cash', 'card', 'upi'] as const).map((method) => {
                      const MethodIcon = methodIcons[method];
                      return (
                        <button
                          key={method}
                          onClick={() => updatePayment(payment.id, { method })}
                          className={cn(
                            "p-2 rounded border transition-colors",
                            payment.method === method
                              ? methodColors[method]
                              : "border-border hover:bg-muted"
                          )}
                        >
                          <MethodIcon className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>

                  {/* Amount */}
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      value={payment.amount || ''}
                      onChange={(e) =>
                        updatePayment(payment.id, { amount: parseFloat(e.target.value) || 0 })
                      }
                      className="pl-7"
                      min="0"
                      max={finalAmount}
                    />
                  </div>

                  {/* Remove */}
                  {payments.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePayment(payment.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Payment Button */}
          <Button variant="outline" className="w-full" onClick={addPayment}>
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>

          {/* Summary */}
          <div className="p-3 rounded-lg border border-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Paid</span>
              <span className={cn(isValid ? "text-success" : "text-foreground")}>
                ₹{totalPaid.toLocaleString('en-IN')}
              </span>
            </div>
            {!isValid && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {remaining > 0 ? 'Remaining' : 'Excess'}
                </span>
                <span className={remaining > 0 ? 'text-destructive' : 'text-warning'}>
                  ₹{Math.abs(remaining).toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || payments.filter((p) => p.amount > 0).length === 0}
            className="bg-success hover:bg-success/90"
          >
            <Check className="h-4 w-4 mr-2" />
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
