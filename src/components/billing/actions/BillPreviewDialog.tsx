import { forwardRef, RefObject } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BillTemplate } from '@/components/print/BillTemplate';
import type { CartItem } from '@/store/uiStore';

interface BillPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  printRef: RefObject<HTMLDivElement>;
  billRef: RefObject<HTMLDivElement>;
  billNumber: string;
  tableNumber?: string;
  items: CartItem[];
  subTotal: number;
  discountAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  finalAmount: number;
  isParcel: boolean;
  restaurantName: string;
  address: string;
  phone: string;
  gstin?: string;
  fssaiNumber?: string;
  currencySymbol: string;
  gstMode: 'cgst_sgst' | 'igst';
  customerName?: string;
  loyaltyPointsUsed: number;
  loyaltyPointsEarned: number;
  showGST: boolean;
  onPrint: () => void;
}

export function BillPreviewDialog({
  open,
  onOpenChange,
  printRef,
  billRef,
  billNumber,
  tableNumber,
  items,
  subTotal,
  discountAmount,
  cgstAmount,
  sgstAmount,
  totalAmount,
  finalAmount,
  isParcel,
  restaurantName,
  address,
  phone,
  gstin,
  fssaiNumber,
  currencySymbol,
  gstMode,
  customerName,
  loyaltyPointsUsed,
  loyaltyPointsEarned,
  showGST,
  onPrint,
}: BillPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-max max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bill Preview</DialogTitle>
        </DialogHeader>
        <div className="bg-white rounded-lg overflow-hidden" ref={printRef}>
          <BillTemplate
            ref={billRef}
            billNumber={billNumber}
            tableNumber={tableNumber}
            items={items}
            subTotal={subTotal}
            discountAmount={discountAmount}
            cgstAmount={cgstAmount}
            sgstAmount={sgstAmount}
            totalAmount={totalAmount}
            finalAmount={finalAmount}
            isParcel={isParcel}
            restaurantName={restaurantName}
            address={address}
            phone={phone}
            gstin={gstin}
            fssaiNumber={fssaiNumber}
            currencySymbol={currencySymbol}
            gstMode={gstMode}
            customerName={customerName}
            loyaltyPointsUsed={loyaltyPointsUsed}
            loyaltyPointsEarned={loyaltyPointsEarned}
            showGST={showGST}
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onPrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Bill
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
