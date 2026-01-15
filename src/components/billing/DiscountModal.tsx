import { useState, useEffect } from 'react';
import { Percent, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface DiscountModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (type: 'percentage' | 'fixed' | null, value: number | null, reason: string | null) => void;
  currentType: 'percentage' | 'fixed' | null;
  currentValue: number | null;
  currentReason: string | null;
  subTotal: number;
}

export function DiscountModal({ 
  open, 
  onClose, 
  onApply, 
  currentType,
  currentValue,
  currentReason,
  subTotal,
}: DiscountModalProps) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [discountReason, setDiscountReason] = useState<string>('');

  // Initialize with current values
  useEffect(() => {
    if (open) {
      setDiscountType(currentType || 'percentage');
      setDiscountValue(currentValue ? currentValue.toString() : '');
      setDiscountReason(currentReason || '');
    }
  }, [open, currentType, currentValue, currentReason]);

  const calculatedDiscount = discountType === 'percentage'
    ? (subTotal * (parseFloat(discountValue) || 0)) / 100
    : parseFloat(discountValue) || 0;

  const handleApply = () => {
    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      onApply(null, null, null);
    } else {
      onApply(discountType, value, discountReason || null);
    }
    onClose();
  };

  const handleClear = () => {
    onApply(null, null, null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-accent" />
            Apply Discount
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Discount Type */}
          <div className="space-y-2">
            <Label>Discount Type</Label>
            <RadioGroup
              value={discountType}
              onValueChange={(val) => setDiscountType(val as 'percentage' | 'fixed')}
              className="grid grid-cols-2 gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage" />
                <Label htmlFor="percentage" className="cursor-pointer">Percentage (%)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed" className="cursor-pointer">Fixed Amount (₹)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Discount Value */}
          <div className="space-y-2">
            <Label>
              {discountType === 'percentage' ? 'Percentage' : 'Amount'}
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max={discountType === 'percentage' ? 100 : subTotal}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percentage' ? 'e.g., 10' : 'e.g., 50'}
                className="pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {discountType === 'percentage' ? '%' : '₹'}
              </span>
            </div>
          </div>

          {/* Preview */}
          {parseFloat(discountValue) > 0 && (
            <div className="p-3 bg-success/10 rounded-lg border border-success/20">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Discount Amount</span>
                <span className="font-semibold text-success">-₹{calculatedDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-muted-foreground">After Discount</span>
                <span className="font-semibold">₹{(subTotal - calculatedDiscount).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason (Optional)</Label>
            <Textarea
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
              placeholder="e.g., Birthday discount, Loyal customer, Manager approval"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {(currentType || currentValue) && (
            <Button variant="destructive" onClick={handleClear}>
              <X className="h-4 w-4 mr-2" />
              Clear Discount
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply} className="bg-success hover:bg-success/90">
            Apply Discount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
