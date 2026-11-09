import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Layers,
  IndianRupee,
  Package,
} from 'lucide-react';

const mobileNavItems = [
  { name: 'Home', path: '/', icon: LayoutDashboard },
  { name: 'Workers', path: '/workers', icon: Users },
  { name: 'Batches', path: '/batches', icon: Layers },
  { name: 'Wages', path: '/payments', icon: IndianRupee },
  { name: 'Stock', path: '/inventory', icon: Package },
];

export const MobileNav: React.FC = () => {
  return (
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
                  <span className="text-[10px] tracking-tight mt-0.5 truncate">
                    {item.name}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

