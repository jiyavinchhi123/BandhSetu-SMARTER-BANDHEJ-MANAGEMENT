import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Layers,
  IndianRupee,
  Package,
  Settings,
  Sparkles,
  ShieldAlert,
  LogOut,
} from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const { user, role, logout } = useAuth();

  const baseNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Artisan Workers', path: '/workers', icon: Users, badge: '384' },
    { name: 'Work Batches', path: '/batches', icon: Layers, badge: '42' },
    { name: 'Wages & Payouts', path: '/payments', icon: IndianRupee },
    { name: 'Fabric Inventory', path: '/inventory', icon: Package },
  ];

  // Admin exclusive navigation
  const adminNavItems = [
    { name: 'Manager Access', path: '/managers', icon: ShieldAlert, badge: 'Control' },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const visibleNavItems =
    role === 'admin'
      ? [...baseNavItems, ...adminNavItems]
      : [...baseNavItems, { name: 'Settings', path: '/settings', icon: Settings }];

  return (
    <aside
      className={`w-64 bg-slate-900 text-slate-200 flex flex-col justify-between border-r border-slate-800 shrink-0 ${className}`}
    >
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-brand-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base tracking-tight leading-tight">
                {APP_NAME}
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                {APP_TAGLINE}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="px-3 py-4 space-y-1">
          <p className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Operations Menu
          </p>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 group-hover:bg-slate-700">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 m-3 rounded-2xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center font-bold text-sm">
            {user?.full_name ? user.full_name.split(' ').map((n) => n[0]).join('') : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'User'}</p>
            <p className="text-[11px] text-amber-400 truncate font-medium">
              {role === 'admin' ? 'Owner / Admin (24/7)' : 'Workshop Manager'}
            </p>
          </div>
        </div>

        <button
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-colors border border-slate-800"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
