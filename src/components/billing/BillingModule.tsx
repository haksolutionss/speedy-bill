import { useEffect } from 'react';
import { Users, Hash, Package } from 'lucide-react';
import { useBillingStore } from '@/store/billingStore';
import { useGetTableSectionsQuery, useGetProductsQuery, useGetActiveBillsQuery } from '@/store/redux/api/billingApi';
import { TableGrid } from './TableGrid';
import { ItemSearch } from './ItemSearch';
import { Cart } from './Cart';
import { BillActions } from './BillActions';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { QueryErrorHandler } from '@/components/common/QueryErrorHandler';
import { TableGridSkeleton, CartSkeleton } from '@/components/common/skeletons';

export function BillingModule() {
  const {
    selectedTable,
    isParcelMode,
    currentBill,
    cart,
    markItemsSentToKitchen,
    createNewBill,
    setTableSections,
    setProducts,
    setBills,
    coverCount,
  } = useBillingStore();

  // RTK Query hooks
  const { 
    data: tableSections, 
    isLoading: sectionsLoading, 
    error: sectionsError,
    refetch: refetchSections 
  } = useGetTableSectionsQuery();
  
  const { 
    data: products, 
    isLoading: productsLoading, 
    error: productsError,
    refetch: refetchProducts 
  } = useGetProductsQuery();
  
  const { 
    data: activeBills, 
    isLoading: billsLoading, 
    error: billsError,
    refetch: refetchBills 
  } = useGetActiveBillsQuery();

  // Sync RTK data to Zustand store
  useEffect(() => {
    if (tableSections) {
      const mapped = tableSections.map(section => ({
        id: section.id,
        name: section.name,
        tables: section.tables.map(t => ({
          id: t.id,
          number: t.number,
          capacity: t.capacity,
          status: t.status as 'available' | 'occupied' | 'reserved',
          currentBillId: t.current_bill_id || undefined,
          currentAmount: t.current_amount ? Number(t.current_amount) : undefined,
        })),
      }));
      setTableSections(mapped);
    }
  }, [tableSections, setTableSections]);

  useEffect(() => {
    if (products) {
      setProducts(products);
    }
  }, [products, setProducts]);

  useEffect(() => {
    if (activeBills) {
      const mapped = activeBills.map(bill => ({
        id: bill.id,
        billNumber: bill.bill_number,
        type: bill.type as 'table' | 'parcel',
        tableId: bill.table_id || undefined,
        tableNumber: bill.table_number || undefined,
        tokenNumber: bill.token_number || undefined,
        items: bill.items.map(item => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          productCode: item.product_code,
          portion: item.portion,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          gstRate: Number(item.gst_rate),
          notes: item.notes || undefined,
          sentToKitchen: item.sent_to_kitchen,
        })),
        subTotal: Number(bill.sub_total),
        discountType: bill.discount_type as 'percentage' | 'fixed' | undefined,
        discountValue: bill.discount_value ? Number(bill.discount_value) : undefined,
        discountReason: bill.discount_reason || undefined,
        discountAmount: Number(bill.discount_amount),
        cgstAmount: Number(bill.cgst_amount),
        sgstAmount: Number(bill.sgst_amount),
        totalAmount: Number(bill.total_amount),
        finalAmount: Number(bill.final_amount),
        coverCount: bill.cover_count || undefined,
        customerId: bill.customer_id || undefined,
        status: bill.status as 'active' | 'settled' | 'unsettled',
        paymentMethod: bill.payment_method as 'cash' | 'card' | 'upi' | 'split' | undefined,
        createdAt: new Date(bill.created_at),
        settledAt: bill.settled_at ? new Date(bill.settled_at) : undefined,
      }));
      setBills(mapped);
    }
  }, [activeBills, setBills]);

  const showBillingPanel = selectedTable || isParcelMode;
  const isLoading = sectionsLoading || productsLoading;

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

  // Handle errors
  if (sectionsError) {
    return <QueryErrorHandler error={sectionsError} onRetry={refetchSections} />;
  }
  
  if (productsError) {
    return <QueryErrorHandler error={productsError} onRetry={refetchProducts} />;
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Left Panel - Table Selection / Current Table */}
      <div className="fixed w-[calc(100%_-_480px)] h-[calc(100vh_-_50px)] left-0 flex-1 flex flex-col border-r border-border min-w-0 overflow-hidden">

        {/* Table Grid */}
        <div className="flex-1 overflow-hidden p-4">
          <ErrorBoundary fallback={<div className="text-destructive p-4">Error loading tables</div>}>
            {isLoading ? <TableGridSkeleton /> : <TableGrid />}
          </ErrorBoundary>
        </div>
      </div>

      {/* Right Panel - Billing */}
      <div className="fixed right-0 w-[480px] h-[calc(100vh_-_50px)] flex flex-col bg-card shrink-0 overflow-hidden">
        {showBillingPanel ? (
          <>
            {/* Current Order Header */}
            <div className="border-b border-border p-4 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  {isParcelMode ? (
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-accent" />
                      <span className="text-lg font-semibold">Parcel Order</span>
                      {currentBill?.tokenNumber && (
                        <span className="ml-2 px-2 py-0.5 bg-accent/20 text-accent rounded text-sm ">
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
                    <span>Covers: {coverCount || 1}</span>
                  </div>
                )}
              </div>
              {currentBill?.billNumber && (
                <p className="text-xs text-muted-foreground mt-1 ">
                  {currentBill.billNumber}
                </p>
              )}
            </div>

            {/* Item Search */}
            <div className="p-4 border-b border-border shrink-0">
              <ErrorBoundary fallback={<div className="text-destructive">Error loading search</div>}>
                {productsLoading ? (
                  <div className="h-10 bg-muted animate-pulse rounded" />
                ) : (
                  <ItemSearch />
                )}
              </ErrorBoundary>
            </div>

            {/* Cart - scrollable */}
            <ErrorBoundary fallback={<div className="text-destructive p-4">Error loading cart</div>}>
              <Cart />
            </ErrorBoundary>

            {/* Actions */}
            <ErrorBoundary fallback={<div className="text-destructive p-4">Error loading actions</div>}>
              <BillActions />
            </ErrorBoundary>
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
