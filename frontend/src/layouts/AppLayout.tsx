import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { MobileNav } from '../components/common/MobileNav';
import { Header } from '../components/common/Header';
import { LanguageSelectModal } from '../components/common/LanguageSelectModal';
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
    <div className="min-h-screen flex bg-[#FFF9F6] text-[#30232A] font-sans antialiased">
      {/* Desktop Sidebar (hidden on mobile) */}
      <Sidebar className="hidden md:flex" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-28 md:pb-8 bg-[#FFF9F6]">
        <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Child Page Outlet */}
          <Outlet context={{ searchTerm, health, isHealthLoading, refreshHealth: checkBackendHealth }} />
        </main>

        {/* Footer */}
        <footer className="mt-auto pt-8 pb-4 text-center px-4 select-none">
          <div className="flex flex-col items-center justify-center gap-2 max-w-xl mx-auto">
            <div className="flex items-center justify-center gap-4 w-full">
              <div className="h-px bg-[#F0E1E1] flex-1 max-w-[120px]" />
              <p className="text-[11px] font-serif tracking-[0.25em] text-[#A20D38] uppercase font-bold">
                KEEPING THE BANDHEJ HERITAGE ALIVE
              </p>
              <div className="h-px bg-[#F0E1E1] flex-1 max-w-[120px]" />
            </div>
            <p className="text-xs text-[#786773] font-medium tracking-wide">
              © 2026 BandhSetu | All Rights Reserved | Made with <span className="text-[#A20D38]">❤️</span> by Jiya Vinchhi
            </p>
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation (visible on mobile only) */}
      <MobileNav />

      {/* Language Selection Modal (prompted after login or on request) */}
      <LanguageSelectModal />
    </div>
  );
};
