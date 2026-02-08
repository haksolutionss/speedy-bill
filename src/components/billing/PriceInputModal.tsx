import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IndianRupee } from 'lucide-react';

interface PriceInputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  onPriceConfirm: (price: number) => void;
  defaultPrice?: number;
}

export function PriceInputModal({
  open,
  onOpenChange,
  productName,
  onPriceConfirm,
  defaultPrice = 0,
}: PriceInputModalProps) {
  const [price, setPrice] = useState<string>(defaultPrice > 0 ? defaultPrice.toString() : '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPrice(defaultPrice > 0 ? defaultPrice.toString() : '');
      // Focus input after modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, defaultPrice]);

  const handleConfirm = () => {
    const numericPrice = parseFloat(price) || 0;
    if (numericPrice > 0) {
      onPriceConfirm(numericPrice);
      // Don't call onOpenChange(false) here - parent manages step state
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && parseFloat(price) > 0) {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  const isValidPrice = parseFloat(price) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-success" />
            Enter Price
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Product Name */}
          <div className="text-center">
            <p className="text-lg font-medium">{productName}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Enter the selling price for this item
            </p>
          </div>

          {/* Price Input */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              ₹
            </span>
            <Input
              ref={inputRef}
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="0.00"
              className="pl-8 text-2xl font-bold text-center h-14"
              autoFocus
            />
          </div>

          {/* Helper Text */}
          <p className="text-xs text-muted-foreground text-center">
            This price will be used for billing. Press Enter to confirm.
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={!isValidPrice}
            >
              Confirm Price
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
