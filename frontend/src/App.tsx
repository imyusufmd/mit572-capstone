import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import ToastContainer from './components/ui/Toast';
import LoginPage from './pages/login/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProductsListPage from './pages/products/ProductsListPage';
import ProductDetailPage from './pages/products/ProductDetailPage';
import InventoryPage from './pages/inventory/InventoryPage';
import ZonesPage from './pages/zones/ZonesPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import ShipmentsListPage from './pages/shipments/ShipmentsListPage';
import ShipmentDetailPage from './pages/shipments/ShipmentDetailPage';
import OrdersListPage from './pages/orders/OrdersListPage';
import OrderDetailPage from './pages/orders/OrderDetailPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import AlertsPage from './pages/alerts/AlertsPage';
import SettingsPage from './pages/settings/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastContainer />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsListPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/zones" element={<ZonesPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/shipments" element={<ShipmentsListPage />} />
            <Route path="/shipments/:id" element={<ShipmentDetailPage />} />
            <Route path="/orders" element={<OrdersListPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
