import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Tag,
  BarChart3,
  Menu,
  X,
  ShieldAlert,
  Settings,
  Languages,
  LogOut,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export const MobileNav: React.FC = () => {
  const { t, language, openLanguageModal } = useLanguage();
  const { role, logout } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mobileNavItems =
    role === 'admin'
      ? [
          { name: t('dashboard', 'Home'), path: '/', icon: LayoutDashboard },
          { name: t('artisan_workers', 'Workers'), path: '/workers', icon: Users },
          { name: t('item_catalogue', 'Items'), path: '/items', icon: Tag },
          { name: t('reports_analytics', 'Reports'), path: '/reports', icon: BarChart3 },
        ]
      : [
          { name: t('artisan_workers', 'Workers'), path: '/workers', icon: Users },
          { name: t('settings', 'Settings'), path: '/settings', icon: Settings },
        ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFF9F6]/95 backdrop-blur-md border-t border-[#F0E1E1] shadow-lg px-2 py-1 safe-area-pb">
        <div className="flex items-center justify-around w-full">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-2 px-1 min-h-[52px] flex-1 min-w-0 max-w-[80px] rounded-xl transition-all ${
                    isActive
                      ? 'text-[#A20D38] font-semibold'
                      : 'text-[#786773] hover:text-[#30232A] font-medium'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`p-1 rounded-lg transition-transform ${
                        isActive ? 'bg-[#FCEDEC] text-[#A20D38] scale-110' : ''
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[64px]">
                      {item.name}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}

          {/* More Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center justify-center py-2 px-1 min-h-[52px] flex-1 min-w-0 max-w-[80px] rounded-xl transition-all ${
              isMoreOpen
                ? 'text-[#A20D38] font-semibold'
                : 'text-[#786773] hover:text-[#30232A] font-medium'
            }`}
          >
            <div className="p-1 rounded-lg">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[64px]">
              {t('operations_menu', 'More')}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Slide-up Drawer */}
      {isMoreOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end animate-fade-in"
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            className="bg-[#FFF9F6] rounded-t-3xl p-5 shadow-2xl space-y-3 pb-8 border-t border-[#F0E1E1]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Handle */}
            <div className="w-10 h-1 bg-[#F0E1E1] rounded-full mx-auto mb-1" />

            <div className="flex items-center justify-between pb-3 border-b border-[#F0E1E1]">
              <h3 className="font-serif font-bold text-[#30232A] text-sm">
                {t('operations_menu', 'Quick Actions & Settings')}
              </h3>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 text-[#786773] hover:text-[#A20D38] rounded-full hover:bg-[#FCEDEC] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              {role === 'admin' && (
                <NavLink
                  to="/managers"
                  onClick={() => setIsMoreOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FCEDEC] text-[#30232A] hover:text-[#A20D38] text-sm font-medium transition-colors"
                >
                  <ShieldAlert className="w-5 h-5 text-[#A20D38]" />
                  <span>{t('manager_access', 'Manager Access')}</span>
                </NavLink>
              )}

              <NavLink
                to="/settings"
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FCEDEC] text-[#30232A] hover:text-[#A20D38] text-sm font-medium transition-colors"
              >
                <Settings className="w-5 h-5 text-[#786773]" />
                <span>{t('settings', 'Settings')}</span>
              </NavLink>

              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  openLanguageModal();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FCEDEC] text-[#30232A] hover:text-[#A20D38] text-sm font-medium text-left transition-colors"
              >
                <Languages className="w-5 h-5 text-[#A20D38]" />
                <span>{language === 'gu' ? 'English (અંગ્રેજી)' : 'ગુજરાતી ભાષા'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FCEDEC] text-[#A20D38] text-sm font-medium text-left transition-colors pt-3 border-t border-[#F0E1E1]"
              >
                <LogOut className="w-5 h-5" />
                <span>{t('sign_out', 'Sign Out')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
