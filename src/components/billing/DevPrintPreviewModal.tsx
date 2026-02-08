import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Eye } from 'lucide-react';
import { BillTemplate } from '@/components/print/BillTemplate';
import type { CartItem } from '@/store/uiStore';

interface DevPrintPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmPrint: () => void;
  billData: {
    billNumber: string;
    tableNumber?: string;
    tokenNumber?: number;
    items: CartItem[];
    subTotal: number;
    discountAmount: number;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    discountReason?: string;
    cgstAmount: number;
    sgstAmount: number;
    totalAmount: number;
    finalAmount: number;
    paymentMethod?: string;
    isParcel?: boolean;
    coverCount?: number;
    restaurantName?: string;
    address?: string;
    phone?: string;
    gstin?: string;
    fssaiNumber?: string;
    currencySymbol?: string;
    gstMode?: 'cgst_sgst' | 'igst';
    customerName?: string;
    loyaltyPointsUsed?: number;
    loyaltyPointsEarned?: number;
    showGST?: boolean;
    isPureVeg?: boolean;
  };
}

export function DevPrintPreviewModal({
  open,
  onOpenChange,
  onConfirmPrint,
  billData,
}: DevPrintPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Development Print Preview
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-white text-black rounded-lg overflow-hidden border">
            <BillTemplate {...billData} />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirmPrint();
              onOpenChange(false);
            }}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}