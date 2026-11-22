import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AdminRoute } from './components/common/AdminRoute';

// Pages
import { Login } from './pages/Login';
import { AccessLocked } from './pages/AccessLocked';
import { Dashboard } from './pages/Dashboard';
import { Workers } from './pages/Workers';
import { WorkerProfile } from './pages/WorkerProfile';
import { Items } from './pages/Items';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { ManagerAccessControl } from './pages/ManagerAccessControl';
import { NotFound } from './pages/NotFound';

import { useAuth } from './context/AuthContext';

// Role-aware root route: Manager lands on Workers directly; Admin lands on Dashboard
const HomeRoute: React.FC = () => {
  const { role } = useAuth();
  if (role === 'manager') {
    return <Navigate to="/workers" replace />;
  }
  return <Dashboard />;
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/access-locked" element={<AccessLocked />} />

            {/* Protected App Shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<HomeRoute />} />

              {/* Accessible by Manager & Admin */}
              <Route path="workers" element={<Workers />} />
              <Route path="workers/:id" element={<WorkerProfile />} />
              <Route path="settings" element={<Settings />} />

              {/* Admin Exclusive Routes - Managers cannot access */}
              <Route
                path="items"
                element={
                  <AdminRoute>
                    <Items />
                  </AdminRoute>
                }
              />
              <Route
                path="reports"
                element={
                  <AdminRoute>
                    <Reports />
                  </AdminRoute>
                }
              />
              <Route
                path="managers"
                element={
                  <AdminRoute>
                    <ManagerAccessControl />
                  </AdminRoute>
                }
              />

              {/* Redirects for decommissioned routes */}
              <Route path="batches" element={<Navigate to="/workers" replace />} />
              <Route path="payments" element={<Navigate to="/workers" replace />} />
              <Route path="inventory" element={<Navigate to="/items" replace />} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  </ToastProvider>
);
};

export default App;
