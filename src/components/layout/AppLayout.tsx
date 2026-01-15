import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  MapPin,
  History,
  Menu,
  X,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { path: '/', label: 'Billing', icon: ShoppingCart },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/tables', label: 'Tables', icon: MapPin },
  { path: '/history', label: 'History', icon: History },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

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

  if (isBillingPage) {
    return (
      <div className="min-h-screen bg-background">
        {/* Minimal header for billing */}
        <div className="fixed top-0 left-0 right-0 h-12 bg-sidebar border-b border-sidebar-border z-50 flex items-center px-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sidebar-foreground">HotelAqsa</span>
          </div>

          <nav className="ml-8 flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

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
          <span className="font-semibold text-sidebar-foreground">HotelAqsa</span>
        </div>

        <nav className="p-4 space-y-1">
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
