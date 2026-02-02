import { forwardRef, RefObject } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { KOTTemplate } from '@/components/print/KOTTemplate';
import type { CartItem } from '@/store/uiStore';

interface KOTPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  printRef: RefObject<HTMLDivElement>;
  kotRef: RefObject<HTMLDivElement>;
  tableNumber?: string;
  items: CartItem[];
  isParcel: boolean;
  onConfirm: () => void;
}

export function KOTPreviewDialog({
  open,
  onOpenChange,
  printRef,
  kotRef,
  tableNumber,
  items,
  isParcel,
  onConfirm,
}: KOTPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-max max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>KOT Preview</DialogTitle>
        </DialogHeader>
        <div className="overflow-hidden" ref={printRef}>
          <KOTTemplate
            ref={kotRef}
            tableNumber={tableNumber}
            items={items}
            isParcel={isParcel}
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="gap-2">
            <Printer className="h-4 w-4" />
            Print & Send to Kitchen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
