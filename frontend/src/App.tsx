import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AdminRoute } from './components/common/AdminRoute';

// Core Eager Pages (Instant First Paint for Sign-in & Dashboard/Workers)
import { Login } from './pages/Login';
import { AccessLocked } from './pages/AccessLocked';
import { Dashboard } from './pages/Dashboard';
import { Workers } from './pages/Workers';
import { NotFound } from './pages/NotFound';

// Code-split Lazy Pages (Loaded on demand to minimize initial bundle size and maximize throughput)
const WorkerProfile = React.lazy(() => import('./pages/WorkerProfile').then((m) => ({ default: m.WorkerProfile })));
const Items = React.lazy(() => import('./pages/Items').then((m) => ({ default: m.Items })));
const Reports = React.lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));
const Settings = React.lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const ManagerAccessControl = React.lazy(() => import('./pages/ManagerAccessControl').then((m) => ({ default: m.ManagerAccessControl })));

import { useAuth } from './context/AuthContext';

// Sleek Brand Loader for Lazy Routes
const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[45vh] flex flex-col items-center justify-center py-16 animate-in fade-in duration-200">
    <div className="w-9 h-9 border-3 border-[#A20D38]/20 border-t-[#A20D38] rounded-full animate-spin" />
    <span className="mt-3.5 text-xs font-semibold text-[#786773] tracking-wide animate-pulse">
      Loading BandhSetu...
    </span>
  </div>
);

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
            <Suspense fallback={<PageLoadingFallback />}>
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
                  <Route path="dashboard" element={<HomeRoute />} />

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
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ToastProvider>
  );
};

export default App;
