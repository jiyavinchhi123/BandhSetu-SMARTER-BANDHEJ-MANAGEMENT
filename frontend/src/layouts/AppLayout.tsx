import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { MobileNav } from '../components/common/MobileNav';
import { Header } from '../components/common/Header';
import { HealthBanner } from '../components/common/HealthBanner';
import { api, HealthResponse } from '../services/api';

export const AppLayout: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);

  const checkBackendHealth = useCallback(async () => {
    setIsHealthLoading(true);
    try {
      const data = await api.checkHealth();
      setHealth(data);
    } catch {
      // Handled inside api.checkHealth fallback
    } finally {
      setIsHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkBackendHealth();
    // Poll every 30 seconds
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, [checkBackendHealth]);

  return (
    <div className="min-h-screen flex bg-craft-surface text-slate-800">
      {/* Desktop Sidebar (hidden on mobile) */}
      <Sidebar className="hidden md:flex" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 max-w-7xl w-full mx-auto space-y-5">
          {/* Real-time Backend Health Status Bar */}
          <HealthBanner
            health={health}
            isLoading={isHealthLoading}
            onRefresh={checkBackendHealth}
          />

          {/* Child Page Outlet */}
          <Outlet context={{ searchTerm, health, isHealthLoading, refreshHealth: checkBackendHealth }} />
        </main>
      </div>

      {/* Mobile Bottom Navigation (visible on mobile only) */}
      <MobileNav />
    </div>
  );
};

