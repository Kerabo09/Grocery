import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RequireRole } from "@/components/RequireRole";

import { AuthPage } from "@/pages/AuthPage";
import { SelectRolePage } from "@/pages/SelectRolePage";
import { NotFoundPage } from "@/pages/NotFoundPage";

import { OwnerLayout } from "@/pages/owner/OwnerLayout";
import { OwnerDashboard } from "@/pages/owner/OwnerDashboard";
import { InventoryPage } from "@/pages/owner/InventoryPage";
import { AnalyticsPage } from "@/pages/owner/AnalyticsPage";
import { StaffPage } from "@/pages/owner/StaffPage";
import { ExpensesPage } from "@/pages/owner/ExpensesPage";
import { SettingsPage } from "@/pages/owner/SettingsPage";

import { CashierLayout } from "@/pages/cashier/CashierLayout";
import { RegisterPage } from "@/pages/cashier/RegisterPage";
import { StockPage } from "@/pages/cashier/StockPage";
import { HistoryPage } from "@/pages/cashier/HistoryPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<AuthPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/select-role" element={<SelectRolePage />} />

              <Route element={<RequireRole role="owner" redirectTo="/cashier" />}>
                <Route path="/owner" element={<OwnerLayout />}>
                  <Route index element={<OwnerDashboard />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="staff" element={<StaffPage />} />
                  <Route path="expenses" element={<ExpensesPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
              </Route>

              <Route path="/cashier" element={<CashierLayout />}>
                <Route index element={<RegisterPage />} />
                <Route path="stock" element={<StockPage />} />
                <Route path="history" element={<HistoryPage />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
