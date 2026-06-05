import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CompanyProvider } from "@/hooks/useCompany";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/Layout";
import RoleGuard from "@/components/RoleGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Invoices from "./pages/Invoices";
import Customers from "./pages/Customers";
import BusinessSettings from "./pages/BusinessSettings";
import SavedInvoices from "./pages/SavedInvoices";
import BulkUpload from "./pages/BulkUpload";
import Inventory from "./pages/Inventory";
import Cashbook from "./pages/Cashbook";
import PurchaseInvoices from "./pages/PurchaseInvoices";
import TeamSettings from "./pages/TeamSettings";
import PublicStore from "./pages/PublicStore";
import Employees from "@/pages/Employees";
import EmployeeOnboarding from "@/pages/EmployeeOnboarding";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CompanyProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Fully public — no auth, no Layout */}
              <Route path="/store/:userId" element={<PublicStore />} />
              <Route path="/onboard/:userId" element={<EmployeeOnboarding />} />

              {/* Auth — no layout */}
              <Route path="/auth" element={<Auth />} />

              {/* All app routes through Layout */}
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/invoices" element={
                  <RoleGuard section="invoices"><Invoices /></RoleGuard>
                } />
                <Route path="/cashbook" element={
                  <RoleGuard section="cashbook"><Cashbook /></RoleGuard>
                } />
                <Route path="/customers" element={
                  <ProtectedRoute>
                    <RoleGuard section="customers"><Customers /></RoleGuard>
                  </ProtectedRoute>
                } />
                <Route path="/inventory" element={
                  <ProtectedRoute>
                    <RoleGuard section="inventory"><Inventory /></RoleGuard>
                  </ProtectedRoute>
                } />
                <Route path="/purchase-invoices" element={
                  <ProtectedRoute><PurchaseInvoices /></ProtectedRoute>
                } />
                <Route path="/business-settings" element={
                  <ProtectedRoute><BusinessSettings /></ProtectedRoute>
                } />
                <Route path="/saved-invoices" element={
                  <ProtectedRoute><SavedInvoices /></ProtectedRoute>
                } />
                <Route path="/bulk-upload" element={
                  <ProtectedRoute><BulkUpload /></ProtectedRoute>
                } />
                <Route path="/team-settings" element={
                  <ProtectedRoute><TeamSettings /></ProtectedRoute>
                } />
                {/* Employees — protected, inside Layout so Navbar is shared */}
                <Route path="/employees" element={
                  <ProtectedRoute><Employees /></ProtectedRoute>
                } />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CompanyProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;