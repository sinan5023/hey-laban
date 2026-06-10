// src/router/AppRouter.jsx
import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import POSPage from "../pages/POSPage";
import OpenSalesPage from "../pages/OpenSalesPage";
import CloseSalesPage from "../pages/CloseSalesPage";
import OrdersPage from "../pages/OrdersPage";
import SettingsPage from "../pages/SettingsPage";
import PageLoader from "../components/ui/PageLoader";
import ChangePasswordPage from "../pages/ChangePasswordPage";
import MenuManagementPage from "../pages/MenuManagementPage";
import { useAuthStore } from "../store/authStore";
import SummaryPage from "../pages/SummaryPage";

function ProtectedRoute({ children }) {
  const { isAuthenticated, isAuthLoading } = useAuthStore();

  if (isAuthLoading) {
    return <div><PageLoader /></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/open-sales"
        element={
          <ProtectedRoute>
            <OpenSalesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/close-sales"
        element={
          <ProtectedRoute>
            <CloseSalesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pos"
        element={
          <ProtectedRoute>
            <POSPage />
          </ProtectedRoute>
        }
      />
       <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <OrdersPage />
          </ProtectedRoute>
        }
      />
       <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/summary"
        element={
          <ProtectedRoute>
            <SummaryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/items"
        element={
          <ProtectedRoute>
            <MenuManagementPage />
          </ProtectedRoute>
        }
      />
       <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />
  
    </Routes>
  );
}

export default AppRouter;