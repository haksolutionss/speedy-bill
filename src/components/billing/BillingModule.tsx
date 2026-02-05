import { useEffect, useRef } from 'react';
import { Users, Hash, Package } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useGetTableSectionsQuery, useGetProductsQuery } from '@/store/redux/api/billingApi';
import { useCartSync } from '@/hooks/useCartSync';
 import { useOfflineSync } from '@/hooks/useOfflineSync';
import { TableGrid } from './TableGrid';
import { ItemSearch, ItemSearchRef } from './ItemSearch';
import { Cart } from './Cart';
import { BillActions } from './BillActions';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { QueryErrorHandler } from '@/components/common/QueryErrorHandler';
import { TableGridSkeleton } from '@/components/common/skeletons';
 import { OfflineIndicator } from '@/components/common/OfflineIndicator';

export function BillingModule() {
  const {
    selectedTable,
    isParcelMode,
    currentBillId,
    cart,
    coverCount,
  } = useUIStore();

  // Cart sync hook for Supabase persistence
  const { forceSync } = useCartSync();
 
   // Offline sync hook for caching
   const { cacheProducts, cacheSections } = useOfflineSync();

  // Refs for focus management
  const itemSearchRef = useRef<ItemSearchRef>(null);
  const tableSearchRef = useRef<HTMLInputElement>(null);

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
 
   // Cache data for offline use
   useEffect(() => {
     if (tableSections && tableSections.length > 0) {
       cacheSections(tableSections);
     }
   }, [tableSections, cacheSections]);
 
   useEffect(() => {
     if (products && products.length > 0) {
       cacheProducts(products);
     }
   }, [products, cacheProducts]);

  // Note: Active bills are now loaded via useCartSync

  const showBillingPanel = selectedTable || isParcelMode;
  const isLoading = sectionsLoading || productsLoading;

  // Focus management: focus item search when table selected, table search when no table
  useEffect(() => {
    if (isLoading) return;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (showBillingPanel) {
        itemSearchRef.current?.focus();
      } else {
        tableSearchRef.current?.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [showBillingPanel, isLoading, selectedTable?.id]);

  // Keyboard shortcuts - F3 and F4 for focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F3 - Focus on table search bar (works even in inputs)
      if (e.key === 'F3') {
        e.preventDefault();
        tableSearchRef.current?.focus();
        return;
      }

      // F4 - Focus on product search bar (works even in inputs)
      if (e.key === 'F4') {
        e.preventDefault();
        itemSearchRef.current?.focus();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle table selection callback to focus item search
  const handleTableSelect = () => {
    setTimeout(() => {
      itemSearchRef.current?.focus();
    }, 100);
  };

  // Handle errors
  if (sectionsError) {
    return <QueryErrorHandler error={sectionsError} onRetry={refetchSections} />;
  }

  if (productsError) {
    return <QueryErrorHandler error={productsError} onRetry={refetchProducts} />;
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
       {/* Offline Status Indicator */}
       <OfflineIndicator />
 
      {/* Left Panel - Table Selection / Current Table */}
      <div className="fixed w-[calc(100%_-_480px)] h-[calc(100vh_-_50px)] left-0 flex-1 flex flex-col border-r border-border min-w-0 overflow-hidden">

        {/* Table Grid */}
        <div className="flex-1 overflow-hidden p-4">
          <ErrorBoundary fallback={<div className="text-destructive p-4">Error loading tables</div>}>
            {isLoading ? (
              <TableGridSkeleton />
            ) : (
              <TableGrid
                onTableSelect={handleTableSelect}
                searchInputRef={tableSearchRef}
              />
            )}
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
              </div>
            </div>

            {/* Item Search */}
            <div className="p-4 border-b border-border shrink-0">
              <ErrorBoundary fallback={<div className="text-destructive">Error loading search</div>}>
                {productsLoading ? (
                  <div className="h-10 bg-muted animate-pulse rounded" />
                ) : (
                  <ItemSearch ref={itemSearchRef} />
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
