import { useState, useRef } from 'react';
import { LayoutGrid, Package, ShoppingCart, Search } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useGetTableSectionsQuery, useGetProductsQuery } from '@/store/redux/api/billingApi';
import { useCartSync } from '@/hooks/useCartSync';
import { cn } from '@/lib/utils';

import { MobileTablesView } from './MobileTablesView';
import { MobileProductsView } from './MobileProductsView';
import { MobileCartView } from './MobileCartView';

type TabType = 'tables' | 'products' | 'cart';

export function MobileBillingModule() {
  const [activeTab, setActiveTab] = useState<TabType>('tables');
  const { selectedTable, isParcelMode, cart } = useUIStore();

  // Cart sync
  useCartSync();

  // RTK Query
  const { data: tableSections, isLoading: sectionsLoading } = useGetTableSectionsQuery();
  const { data: products, isLoading: productsLoading } = useGetProductsQuery();

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const showBillingContext = selectedTable || isParcelMode;

  // Auto-switch to products when table selected
  const handleTableSelect = () => {
    setActiveTab('products');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 h-14 border-b border-border bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {showBillingContext ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {isParcelMode ? 'Parcel' : `Table ${selectedTable?.number}`}
              </span>
              {cartItemCount > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {cartItemCount} items
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Select a table</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {activeTab === 'products' && (
            <button
              onClick={() => {/* TODO: Open search modal */}}
              className="p-2 rounded-lg hover:bg-muted"
            >
              <Search className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      {/* Tab Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'tables' && (
          <MobileTablesView
            tableSections={tableSections || []}
            isLoading={sectionsLoading}
            onTableSelect={handleTableSelect}
          />
        )}
        {activeTab === 'products' && (
          <MobileProductsView
            products={products || []}
            isLoading={productsLoading}
          />
        )}
        {activeTab === 'cart' && (
          <MobileCartView />
        )}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="shrink-0 h-16 border-t border-border bg-card">
        <div className="h-full grid grid-cols-3">
          <TabButton
            active={activeTab === 'tables'}
            onClick={() => setActiveTab('tables')}
            icon={<LayoutGrid className="h-5 w-5" />}
            label="Tables"
          />
          <TabButton
            active={activeTab === 'products'}
            onClick={() => setActiveTab('products')}
            icon={<Package className="h-5 w-5" />}
            label="Products"
            disabled={!showBillingContext}
          />
          <TabButton
            active={activeTab === 'cart'}
            onClick={() => setActiveTab('cart')}
            icon={<ShoppingCart className="h-5 w-5" />}
            label="Cart"
            badge={cartItemCount > 0 ? cartItemCount : undefined}
            disabled={!showBillingContext}
          />
        </div>
      </nav>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  disabled?: boolean;
}

function TabButton({ active, onClick, icon, label, badge, disabled }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center justify-center gap-1 transition-colors relative",
        active 
          ? "text-primary" 
          : "text-muted-foreground hover:text-foreground",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
      {active && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
      )}
    </button>
  );
}
