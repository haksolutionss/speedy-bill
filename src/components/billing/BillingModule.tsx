import { useEffect } from 'react';
import { Users, Hash, Package } from 'lucide-react';
import { useBillingStore } from '@/store/billingStore';
import { TableGrid } from './TableGrid';
import { ItemSearch } from './ItemSearch';
import { Cart } from './Cart';
import { BillSummary } from './BillSummary';
import { BillActions } from './BillActions';

export function BillingModule() {
  const { 
    selectedTable, 
    isParcelMode, 
    currentBill,
    cart,
    markItemsSentToKitchen,
    createNewBill,
    settleBill
  } = useBillingStore();
  
  const showBillingPanel = selectedTable || isParcelMode;
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === 'F1') {
        e.preventDefault();
        const pendingItems = cart.filter(item => !item.sentToKitchen);
        if (pendingItems.length > 0) {
          markItemsSentToKitchen();
          createNewBill();
        }
      }
      
      if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length > 0) {
          // Would open payment dialog in full implementation
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, markItemsSentToKitchen, createNewBill]);
  
  return (
    <div className="h-screen flex bg-background">
      {/* Left Panel - Table Selection / Current Table */}
      <div className="flex-1 flex flex-col border-r border-border">
        {/* Header */}
        <div className="border-b border-border p-4">
          <h1 className="text-lg font-semibold">Restaurant Billing</h1>
          <p className="text-sm text-muted-foreground">Select a table or start a parcel order</p>
        </div>
        
        {/* Table Grid */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          <TableGrid />
        </div>
      </div>
      
      {/* Right Panel - Billing */}
      <div className="w-[480px] flex flex-col bg-card">
        {showBillingPanel ? (
          <>
            {/* Current Order Header */}
            <div className="border-b border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  {isParcelMode ? (
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-accent" />
                      <span className="text-lg font-semibold">Parcel Order</span>
                      {currentBill?.tokenNumber && (
                        <span className="ml-2 px-2 py-0.5 bg-accent/20 text-accent rounded text-sm font-mono">
                          Token #{currentBill.tokenNumber}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Hash className="h-5 w-5 text-success" />
                      <span className="text-lg font-semibold">Table {selectedTable?.number}</span>
                      <span className="text-muted-foreground text-sm">
                        ({selectedTable?.capacity} seats)
                      </span>
                    </div>
                  )}
                </div>
                {!isParcelMode && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Covers: {currentBill?.coverCount || 1}</span>
                  </div>
                )}
              </div>
              {currentBill?.billNumber && (
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {currentBill.billNumber}
                </p>
              )}
            </div>
            
            {/* Item Search */}
            <div className="p-4 border-b border-border">
              <ItemSearch />
            </div>
            
            {/* Cart */}
            <Cart />
            
            {/* Bill Summary */}
            <BillSummary />
            
            {/* Actions */}
            <BillActions />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Hash className="w-10 h-10 opacity-50" />
            </div>
            <p className="text-lg font-medium mb-1">No table selected</p>
            <p className="text-sm text-center">
              Select a table from the left panel<br />or start a parcel order
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
