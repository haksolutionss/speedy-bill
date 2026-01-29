import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { ReduxProvider } from "@/providers/ReduxProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { RealtimeSubscription } from "@/components/common/RealtimeSubscription";
import Index from "./pages/Index";
import Products from "./pages/Products";
import Tables from "./pages/Tables";
import History from "./pages/History";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import BillDetail from "./pages/BillDetail";
import Settings from "./pages/Settings";
import Staff from "./pages/Staff";
import Customers from "./pages/Customers";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import { PrintJobListener } from "./electron/PrintJobListener";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Check for Electron environment - we expose electronAPI and isElectronApp from preload
const isElectron =
  typeof window !== "undefined" &&
  ((window as any).isElectronApp === true ||
    typeof (window as any).electronAPI !== "undefined" ||
    navigator.userAgent.toLowerCase().includes('electron'));

const Router = isElectron ? HashRouter : BrowserRouter;

const App = () => (
  <ReduxProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RealtimeSubscription />
        <PrintJobListener />
        <Toaster />
        <Sonner position="top-right" />
        <Router>
          <AuthGuard>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/products" element={<Products />} />
                <Route path="/tables" element={<Tables />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/staff" element={<Staff />} />
                <Route path="/history" element={<History />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/bill/:id" element={<BillDetail />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </AuthGuard>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  </ReduxProvider>
);

export default App;
