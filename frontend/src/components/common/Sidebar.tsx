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
} from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '../../utils/constants';

interface SidebarProps {
  className?: string;
}

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Artisan Workers', path: '/workers', icon: Users, badge: '384' },
  { name: 'Work Batches', path: '/batches', icon: Layers, badge: '42' },
  { name: 'Wages & Payouts', path: '/payments', icon: IndianRupee },
  { name: 'Fabric Inventory', path: '/inventory', icon: Package },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
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
          {navItems.map((item) => {
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

      {/* Footer Profile / Business Summary */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 m-3 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center font-bold text-sm">
            BW
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">Bandhej Workshop</p>
            <p className="text-[11px] text-emerald-400 truncate flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
              384 Women Active
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

