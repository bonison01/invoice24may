import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/Layout";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Invoices from "./pages/Invoices";
import Customers from "./pages/Customers";
import BusinessSettings from "./pages/BusinessSettings";
import SavedInvoices from "./pages/SavedInvoices";
import BulkUpload from "./pages/BulkUpload";
import Inventory from "./pages/Inventory";
import Cashbook from "./pages/Cashbook";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Auth route does NOT include navbar */}
            <Route path="/auth" element={<Auth />} />

            {/* All other routes go through Layout */}
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/cashbook" element={<Cashbook />} />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute>
                    <Customers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business-settings"
                element={
                  <ProtectedRoute>
                    <BusinessSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/saved-invoices"
                element={
                  <ProtectedRoute>
                    <SavedInvoices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bulk-upload"
                element={
                  <ProtectedRoute>
                    <BulkUpload />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute>
                    <Inventory />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
