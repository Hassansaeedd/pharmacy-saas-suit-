import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { InventoryPage } from './pages/InventoryPage';
import { POSPage } from './pages/POSPage';
import { ReportsPage } from './pages/ReportsPage';
import { ExpiryPage } from './pages/ExpiryPage';
import { ForecastingPage } from './pages/ForecastingPage';
import { WhatsAppPage } from './pages/WhatsAppPage';
import { AdminPage } from './pages/AdminPage';
import { CustomerKhataPage } from './pages/CustomerKhataPage';
import { ProcurementPage } from './pages/ProcurementPage';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

// Route wrapper for root "/" — redirects Super Admin to /admin, others to Dashboard
const HomeRoute: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'super_admin') {
    return <Navigate to="/admin" replace />;
  }
  return <DashboardPage />;
};

// Guard for pharmacy operational pages (POS, Inventory, Expiry, etc.)
const PharmacyOnlyPage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role === 'super_admin') {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
};

export function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboard" element={<OnboardingPage />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/"
              element={
                <AppLayout>
                  <HomeRoute />
                </AppLayout>
              }
            />
            <Route
              path="/inventory"
              element={
                <AppLayout>
                  <PharmacyOnlyPage>
                    <InventoryPage />
                  </PharmacyOnlyPage>
                </AppLayout>
              }
            />
            <Route
              path="/pos"
              element={
                <AppLayout>
                  <PharmacyOnlyPage>
                    <POSPage />
                  </PharmacyOnlyPage>
                </AppLayout>
              }
            />
            <Route
              path="/khata"
              element={
                <AppLayout>
                  <PharmacyOnlyPage>
                    <CustomerKhataPage />
                  </PharmacyOnlyPage>
                </AppLayout>
              }
            />
            <Route
              path="/procurement"
              element={
                <AppLayout>
                  <PharmacyOnlyPage>
                    <ProcurementPage />
                  </PharmacyOnlyPage>
                </AppLayout>
              }
            />
            <Route
              path="/reports"
              element={
                <AppLayout>
                  <PharmacyOnlyPage>
                    <ReportsPage />
                  </PharmacyOnlyPage>
                </AppLayout>
              }
            />
            <Route
              path="/expiry"
              element={
                <AppLayout>
                  <PharmacyOnlyPage>
                    <ExpiryPage />
                  </PharmacyOnlyPage>
                </AppLayout>
              }
            />
            <Route
              path="/forecasting"
              element={
                <AppLayout>
                  <PharmacyOnlyPage>
                    <ForecastingPage />
                  </PharmacyOnlyPage>
                </AppLayout>
              }
            />
            <Route
              path="/whatsapp"
              element={
                <AppLayout>
                  <PharmacyOnlyPage>
                    <WhatsAppPage />
                  </PharmacyOnlyPage>
                </AppLayout>
              }
            />
            <Route
              path="/admin"
              element={
                <AppLayout>
                  <AdminPage />
                </AppLayout>
              }
            />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
