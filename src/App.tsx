import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ReduxProvider } from "@/providers/ReduxProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import { RealtimeSubscription } from "@/components/common/RealtimeSubscription";
import Index from "./pages/Index";
import Products from "./pages/Products";
import Tables from "./pages/Tables";
import History from "./pages/History";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import BillDetail from "./pages/BillDetail";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ReduxProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RealtimeSubscription />
        <Toaster />
        <Sonner position="top-right" />
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/products" element={<Products />} />
              <Route path="/tables" element={<Tables />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/bill/:id" element={<BillDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ReduxProvider>
);

export default App;
