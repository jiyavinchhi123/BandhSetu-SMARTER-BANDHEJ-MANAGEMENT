import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AdminRoute } from './components/common/AdminRoute';

// Pages
import { Login } from './pages/Login';
import { AccessLocked } from './pages/AccessLocked';
import { Dashboard } from './pages/Dashboard';
import { Workers } from './pages/Workers';
import { Batches } from './pages/Batches';
import { Payments } from './pages/Payments';
import { Inventory } from './pages/Inventory';
import { Settings } from './pages/Settings';
import { ManagerAccessControl } from './pages/ManagerAccessControl';
import { NotFound } from './pages/NotFound';

export const App: React.FC = () => {
  return (
    <ToastProvider>
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
              <Route index element={<Dashboard />} />
              <Route path="workers" element={<Workers />} />
              <Route path="batches" element={<Batches />} />
              <Route path="payments" element={<Payments />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="settings" element={<Settings />} />

              {/* Admin Exclusive: Manager Access Control */}
              <Route
                path="managers"
                element={
                  <AdminRoute>
                    <ManagerAccessControl />
                  </AdminRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
