import { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  MapPin,
  History,
  Menu,
  Settings,
  BarChart3,
  LogOut,
  Users,
  UserCog
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { PrinterStatusIndicator } from '@/components/billing/PrinterStatusIndicator';
import type { StaffPermissions } from '@/types/settings';

interface NavItem {
  path: string;
  label: string;
  icon: typeof ShoppingCart;
  permission?: keyof StaffPermissions;
}

const allNavItems: NavItem[] = [
  { path: '/', label: 'Billing', icon: ShoppingCart, permission: 'canAccessBilling' },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'canAccessReports' },
  { path: '/reports', label: 'Reports', icon: BarChart3, permission: 'canAccessReports' },
  { path: '/products', label: 'Products', icon: Package, permission: 'canAccessProducts' },
  { path: '/tables', label: 'Tables', icon: MapPin, permission: 'canAccessTables' },
  { path: '/customers', label: 'Customers', icon: Users, permission: 'canAccessCustomers' },
  { path: '/staff', label: 'Staff', icon: UserCog, permission: 'canAccessStaff' },
  { path: '/history', label: 'History', icon: History, permission: 'canAccessHistory' },
  { path: '/settings', label: 'Settings', icon: Settings, permission: 'canAccessSettings' },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();
  const { user, logout, hasPermission } = useAuthStore();
  const { settings } = useSettingsStore();

  // Filter nav items based on user permissions
  const navItems = useMemo(() => {
    return allNavItems.filter(item => {
      if (!item.permission) return true;
      return hasPermission(item.permission);
    });
  }, [hasPermission, user?.permissions]);

  // Auth and onboarding pages should render without layout
  const isAuthPage = location.pathname === '/auth' || location.pathname === '/onboarding';
  if (isAuthPage) {
    return <>{children}</>;
  }

  const isBillViewOrEditPage = location.pathname.includes('/bill')

  if (isBillViewOrEditPage) {
    return (
      <div className="min-h-screen bg-background">
        <main className="">
          {children}
        </main>
      </div>
    )
  }

  // Check if we're on billing page (full screen mode)
  const isBillingPage = location.pathname === '/';

  const businessName = settings.business.name || 'HotelAqsa';

  if (isBillingPage) {
    return (
      <div className="min-h-screen bg-background">
        {/* Minimal header for billing with menu button */}
        <div className="fixed top-0 left-0 right-0 h-12 bg-sidebar border-b border-sidebar-border z-50 flex items-center px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground"
              onClick={() => setSheetOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-semibold text-sidebar-foreground">{businessName}</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <PrinterStatusIndicator />
            {user && (
              <>
                <span className="text-sm text-sidebar-foreground/70 hidden sm:inline">{user.name || user.mobile}</span>
                <Button variant="ghost" size="sm" onClick={logout} className="h-8">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="px-6 py-4 border-b border-sidebar-border">
              <SheetTitle className="text-left font-semibold">{businessName}</SheetTitle>
            </SheetHeader>

            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSheetOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {user && (
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-sidebar-foreground/70 truncate">{user.name || user.mobile}</span>
                  <Button variant="ghost" size="sm" onClick={() => {
                    logout();
                    setSheetOpen(false);
                  }}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        <main className="pt-12">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border">
          <span className="font-semibold text-sidebar-foreground">{businessName}</span>
        </div>

        <nav className="p-4 space-y-1 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-sidebar-foreground/70 truncate">{user.name || user.mobile}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-background border-b border-border flex items-center px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}