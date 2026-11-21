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

  const mobileNavItems = [
    { name: t('dashboard', 'Home'), path: '/', icon: LayoutDashboard },
    { name: t('artisan_workers', 'Workers'), path: '/workers', icon: Users },
    { name: t('item_catalogue', 'Items'), path: '/items', icon: Tag },
    { name: t('reports_analytics', 'Reports'), path: '/reports', icon: BarChart3 },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1 safe-area-pb">
        <div className="grid grid-cols-5 items-center justify-around">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-2 px-1 min-h-[52px] rounded-xl transition-all ${
                    isActive
                      ? 'text-brand-600 font-semibold'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`p-1 rounded-lg transition-transform ${
                        isActive ? 'bg-brand-50 text-brand-600 scale-110' : ''
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[60px]">
                      {item.name}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}

          {/* 5th Tab: More Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center justify-center py-2 px-1 min-h-[52px] rounded-xl transition-all ${
              isMoreOpen
                ? 'text-brand-600 font-semibold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className="p-1 rounded-lg">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 truncate">
              {t('operations_menu', 'More')}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Slide-up Drawer */}
      {isMoreOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex flex-col justify-end animate-fade-in"
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl p-5 shadow-2xl space-y-3 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {t('operations_menu', 'Quick Actions & Settings')}
              </h3>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              {role === 'admin' && (
                <>
                  <NavLink
                    to="/managers"
                    onClick={() => setIsMoreOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
                  >
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                    <span>{t('manager_access', 'Manager Access')}</span>
                  </NavLink>
                  <NavLink
                    to="/settings"
                    onClick={() => setIsMoreOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
                  >
                    <Settings className="w-5 h-5 text-slate-600" />
                    <span>{t('settings', 'Settings')}</span>
                  </NavLink>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  openLanguageModal();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-700 text-sm font-medium text-left transition-colors"
              >
                <Languages className="w-5 h-5 text-brand-600" />
                <span>{language === 'gu' ? 'English (અંગ્રેજી)' : 'ગુજરાતી ભાષા'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-rose-50 text-rose-600 text-sm font-medium text-left transition-colors pt-2 border-t border-slate-100"
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
