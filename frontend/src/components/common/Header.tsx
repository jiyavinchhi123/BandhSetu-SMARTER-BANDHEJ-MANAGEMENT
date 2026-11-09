import React from 'react';
import { Search, Bell, Sparkles } from 'lucide-react';
import { APP_NAME } from '../../utils/constants';

interface HeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpenQuickAction?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchTerm,
  onSearchChange,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Mobile Logo Branding */}
        <div className="flex items-center gap-2.5 md:hidden">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm leading-tight">{APP_NAME}</h1>
            <p className="text-[10px] text-slate-500 font-medium">Operations</p>
          </div>
        </div>

        {/* Global Fast Search Bar */}
        <div className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search artisan workers, batch ID, knot style..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>
        </div>

        {/* Action icons & profile */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-white" />
          </button>

          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-500 to-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              BM
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-tight">Bhavna Mehta</p>
              <p className="text-[10px] text-slate-500">Master Supervisor</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile search input for screens < sm */}
      <div className="mt-2.5 sm:hidden">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search workers, batches..."
            className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all min-h-[42px]"
          />
        </div>
      </div>
    </header>
  );
};

