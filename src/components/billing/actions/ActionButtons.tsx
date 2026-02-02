import { Printer, Receipt, Percent, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionButtonsProps {
  hasPendingItems: boolean;
  hasItems: boolean;
  isPrinting: boolean;
  discountValue: number | null;
  discountType: 'percentage' | 'fixed' | null;
  currencySymbol: string;
  selectedCustomerName?: string;
  onPrintKOT: () => void;
  onPrintBill: () => void;
  onOpenDiscount: () => void;
  onOpenCustomer: () => void;
}

export function ActionButtons({
  hasPendingItems,
  hasItems,
  isPrinting,
  discountValue,
  discountType,
  currencySymbol,
  selectedCustomerName,
  onPrintKOT,
  onPrintBill,
  onOpenDiscount,
  onOpenCustomer,
}: ActionButtonsProps) {
  return (
    <div className="action-bar fixed bottom-0 bg-background right-0 w-[480px]">
      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="outline"
          onClick={onOpenCustomer}
          className={selectedCustomerName ? 'border-accent text-accent' : ''}
        >
          <Users className="h-4 w-4 mr-1" />
          {selectedCustomerName || 'Loyalty'}
        </Button>
        <Button
          variant="outline"
          onClick={onOpenDiscount}
          className={discountValue ? 'border-success text-success' : ''}
        >
          {discountValue ? (
            <>
              <Percent className="h-4 w-4 mr-1" />
              {discountType === 'percentage' ? `${discountValue}%` : `${currencySymbol}${discountValue}`}
            </>
          ) : (
            'Total'
          )}
        </Button>
        <Button
          onClick={onPrintKOT}
          disabled={!hasPendingItems || isPrinting}
          variant="secondary"
          className="gap-1.5"
        >
          <Printer className="h-4 w-4" />
          KOT
          <kbd className="kbd ml-1">F1</kbd>
        </Button>
        <Button
          onClick={onPrintBill}
          disabled={!hasItems || isPrinting}
          className="gap-1.5 bg-success hover:bg-success/90"
        >
          <Receipt className="h-4 w-4" />
          Bill
          <kbd className="kbd ml-1 bg-success-foreground/20 border-success-foreground/30 text-success-foreground">F2</kbd>
        </Button>
      </div>
    </div>
  );
}
