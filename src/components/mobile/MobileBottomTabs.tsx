import { LayoutGrid, Package, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MobileTab = 'tables' | 'products' | 'cart';

interface MobileBottomTabsProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  cartItemCount: number;
  isProductsDisabled: boolean;
}

export function MobileBottomTabs({
  activeTab,
  onTabChange,
  cartItemCount,
  isProductsDisabled,
}: MobileBottomTabsProps) {
  const tabs = [
    { id: 'tables' as MobileTab, label: 'Tables', icon: LayoutGrid, disabled: false },
    { id: 'products' as MobileTab, label: 'Products', icon: Package, disabled: isProductsDisabled },
    { id: 'cart' as MobileTab, label: 'Cart', icon: ShoppingCart, disabled: false },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const showBadge = tab.id === 'cart' && cartItemCount > 0;

          return (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              disabled={tab.disabled}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative",
                isActive 
                  ? "text-primary" 
                  : tab.disabled 
                    ? "text-muted-foreground/40 cursor-not-allowed" 
                    : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-6 w-6", isActive && "scale-110 transition-transform")} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center px-1">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </div>
              <span className={cn("text-xs font-medium", isActive && "font-semibold")}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-b-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
