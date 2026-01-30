import { useState, useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { MobileBottomTabs, MobileTab } from './MobileBottomTabs';
import { MobileTableTab } from './MobileTableTab';
import { MobileProductsTab } from './MobileProductsTab';
import { MobileCartTab } from './MobileCartTab';
import { cn } from '@/lib/utils';

export function MobilePOSLayout() {
  const [activeTab, setActiveTab] = useState<MobileTab>('tables');
  const { cart, selectedTable, isParcelMode } = useUIStore();

  const isTableSelected = selectedTable || isParcelMode;
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // When table is selected, auto-switch to products tab
  const handleTableSelect = () => {
    setActiveTab('products');
  };

  // When item is added, show feedback (optional: could switch to cart)
  const handleItemAdded = () => {
    // Could add haptic feedback here if needed
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center px-4 shrink-0 bg-card">
        <h1 className="text-lg font-semibold">
          {activeTab === 'tables' && 'Select Table'}
          {activeTab === 'products' && (
            isTableSelected
              ? isParcelMode
                ? 'Parcel Order'
                : `Table ${selectedTable?.number}`
              : 'Products'
          )}
          {activeTab === 'cart' && 'Cart'}
        </h1>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 pb-16">
        <div className={cn("h-full", activeTab !== 'tables' && "hidden")}>
          <MobileTableTab onTableSelect={handleTableSelect} />
        </div>
        <div className={cn("h-full", activeTab !== 'products' && "hidden")}>
          <MobileProductsTab onItemAdded={handleItemAdded} />
        </div>
        <div className={cn("h-full", activeTab !== 'cart' && "hidden")}>
          <MobileCartTab />
        </div>
      </div>

      {/* Bottom Tabs */}
      <MobileBottomTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        cartItemCount={cartItemCount}
        isProductsDisabled={!isTableSelected}
      />
    </div>
  );
}
