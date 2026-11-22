import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Tag,
  Settings,
  ShieldAlert,
  BarChart3,
} from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { BandhaniWatermark } from './BandhaniMotif';

interface SidebarProps {
  className?: string;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const { role } = useAuth();
  const { t } = useLanguage();

  const baseNavItems: NavItem[] = [
    { name: t('dashboard', 'Dashboard'), path: '/', icon: LayoutDashboard },
    { name: t('artisan_workers', 'Artisan Workers'), path: '/workers', icon: Users },
    { name: t('item_catalogue', 'Item Catalogue'), path: '/items', icon: Tag },
    { name: t('reports_analytics', 'Reports & Analytics'), path: '/reports', icon: BarChart3 },
  ];

  // Admin exclusive navigation
  const adminNavItems: NavItem[] = [
    { name: t('manager_access', 'Manager Access'), path: '/managers', icon: ShieldAlert },
    { name: t('settings', 'Settings'), path: '/settings', icon: Settings },
  ];

  const visibleNavItems: NavItem[] =
    role === 'admin'
      ? [...baseNavItems, ...adminNavItems]
      : [
          { name: t('artisan_workers', 'Artisan Workers'), path: '/workers', icon: Users },
          { name: t('settings', 'Settings'), path: '/settings', icon: Settings },
        ];

  return (
    <aside
      className={`w-64 bg-[#FFF9F6] text-[#30232A] flex flex-col justify-between border-r border-[#F0E1E1] shrink-0 relative overflow-hidden select-none ${className}`}
    >
      <div className="relative z-10">
        {/* Brand Header */}
        <div className="pt-7 pb-5 px-5 flex flex-col items-center text-center">
          <Link to="/" className="block focus:outline-hidden group">
            <img
              src="/bandhsetu-logo.png"
              alt="BandhSetu — Smarter Bandhej Management"
              className="w-48 max-w-full h-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>
        </div>

        {/* Navigation list */}
        <div className="px-4 py-2 space-y-1.5">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-[#A20D38] text-white shadow-xs font-semibold'
                      : 'text-[#30232A] hover:bg-[#FCEDEC] hover:text-[#A20D38]'
                  }`
                }
              >
                <div className="flex items-center gap-3.5">
                  <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FCEDEC] text-[#A20D38]">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Decorative Bandhani Watermark at Bottom */}
      <div className="absolute -bottom-10 -left-10 w-44 h-44 pointer-events-none opacity-40">
        <BandhaniWatermark className="w-full h-full text-[#A20D38]" />
      </div>
    </aside>
  );
};
