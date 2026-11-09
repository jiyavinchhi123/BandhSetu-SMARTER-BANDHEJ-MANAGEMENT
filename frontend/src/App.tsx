import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Workers } from './pages/Workers';
import { Batches } from './pages/Batches';
import { Payments } from './pages/Payments';
import { Inventory } from './pages/Inventory';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="workers" element={<Workers />} />
            <Route path="batches" element={<Batches />} />
            <Route path="payments" element={<Payments />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;

