import React, { useState } from 'react';
import { Search, LogOut, ChevronDown, Languages, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { translateEntityName } from '../../utils/translations';
import { BandhaniLogo } from './BandhaniMotif';

interface HeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpenQuickAction?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchTerm,
  onSearchChange,
}) => {
  const { user, role, logout } = useAuth();
  const { language, openLanguageModal, t } = useLanguage();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'BM';

  return (
    <header className="sticky top-0 z-30 bg-[#FFF9F6]/90 backdrop-blur-md border-b border-[#F0E1E1] px-4 sm:px-8 py-3 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Mobile Logo Branding */}
        <div className="flex items-center gap-2 md:hidden">
          <img
            src="/bandhsetu-logo.png"
            alt="BandhSetu"
            className="h-9 w-auto object-contain"
          />
        </div>

        {/* Global Fast Search Bar */}
        <div className="flex-1 max-w-xl hidden sm:block">
          <div className="relative">
            <Search className="w-4 h-4 text-[#786773] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('search_global_placeholder', 'Search artisan workers...')}
              className="w-full pl-11 pr-4 py-2.5 bg-white hover:bg-white/90 focus:bg-white text-xs sm:text-sm text-[#30232A] placeholder:text-[#786773]/70 rounded-full border border-[#F0E1E1] focus:outline-none focus:ring-2 focus:ring-[#A20D38]/20 focus:border-[#A20D38] shadow-2xs transition-all"
            />
          </div>
        </div>

        {/* Action icons & profile */}
        <div className="flex items-center gap-3">
          {/* Language Switcher Pill */}
          <button
            type="button"
            onClick={openLanguageModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#F0E1E1] hover:border-[#A20D38]/40 bg-white hover:bg-[#FCEDEC]/50 text-xs font-semibold text-[#30232A] transition-all active:scale-95 shadow-2xs"
            title="Change Language / ભાષા બદલો"
          >
            <Languages className="w-3.5 h-3.5 text-[#A20D38]" />
            <span className="font-medium hidden sm:inline">{language === 'gu' ? 'ગુજરાતી' : 'English'}</span>
            <span className="font-bold sm:hidden">{language === 'gu' ? 'ગુ' : 'EN'}</span>
          </button>

          {/* User Profile Pill with Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 pl-2 py-1 pr-2 rounded-full hover:bg-white/80 active:scale-95 transition-all border border-transparent hover:border-[#F0E1E1]"
            >
              <div className="w-9 h-9 rounded-full bg-[#880D32] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                {initials}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-[#30232A] leading-tight">
                  {user?.full_name ? translateEntityName(user.full_name, language) : 'Bhavna Mehta'}
                </p>
                <p className="text-[10px] text-[#786773] font-medium leading-none mt-0.5">
                  {role === 'admin' ? 'Admin' : 'Manager'}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#786773] hidden md:block" />
            </button>

            {isDropdownOpen && (
              <>
                {/* Backdrop for click-away on mobile touch */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div
                  className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-[#F0E1E1] py-1.5 z-50 animate-fade-in"
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-[#F0E1E1]">
                    <p className="text-xs font-bold text-[#30232A] truncate">
                      {user?.full_name ? translateEntityName(user.full_name, language) : 'User'}
                    </p>
                    <p className="text-[11px] text-[#786773] truncate">{user?.email || ''}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#30232A] hover:bg-[#FCEDEC] hover:text-[#A20D38] transition-colors"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#786773]" />
                    <span>{t('settings', 'Settings')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>{t('sign_out', 'Sign Out')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
