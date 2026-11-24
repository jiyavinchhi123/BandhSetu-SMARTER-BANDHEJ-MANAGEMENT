import React, { useState } from 'react';
import { LogOut, ChevronDown, Languages, User as UserIcon, Building2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { translateEntityName } from '../../utils/translations';
import { BandhaniLogo } from './BandhaniMotif';

interface HeaderProps {
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  onOpenQuickAction?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const { user, role, companyName, companyCode, isPrimaryAdmin, logout } = useAuth();
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
        {/* Mobile Logo Branding & Active Company */}
        <div className="flex items-center gap-2.5 md:hidden">
          <img
            src="/bandhsetu-logo.png"
            alt="BandhSetu"
            className="h-8 w-auto object-contain"
          />
          <div className="flex flex-col border-l border-[#F0E1E1] pl-2">
            <span className="text-xs font-bold text-[#30232A] truncate max-w-[130px]">
              {companyName || 'Vinchhi Bandhej'}
            </span>
            <span className="text-[9px] font-semibold text-[#A20D38]">
              {companyCode || 'COMP-0001'}
            </span>
          </div>
        </div>

        {/* Company Identity Display (Replaces old search position) */}
        <div className="flex-1 max-w-xl hidden md:flex items-center">
          <div className="flex items-center gap-3 bg-white/90 border border-[#F0E1E1] shadow-2xs rounded-2xl px-4 py-2 hover:border-[#A20D38]/30 transition-all">
            <div className="w-8 h-8 rounded-xl bg-[#A20D38]/10 text-[#A20D38] flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-[#30232A] truncate">
                  {companyName || 'Vinchhi Bandhej'}
                </span>
                <span className="text-[10px] font-semibold bg-[#A20D38]/10 text-[#A20D38] px-2 py-0.5 rounded-full border border-[#A20D38]/20 shrink-0">
                  {companyCode || 'COMP-0001'}
                </span>
                {isPrimaryAdmin && (
                  <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 inline-flex items-center gap-1 shrink-0">
                    <ShieldCheck className="w-3 h-3 text-amber-600" />
                    <span>{language === 'gu' ? 'મુખ્ય સંચાલક' : 'Primary Admin'}</span>
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#786773] truncate">
                {language === 'gu' ? 'સક્રિય કંપની વર્કશોપ • સંપૂર્ણ ડેટા અલગતા' : 'Active Company Workshop • Isolated Data'}
              </span>
            </div>
          </div>
        </div>

        {/* Action icons & profile */}
        <div className="flex items-center gap-3">
          {/* Language Switcher Pill */}
          <button
            type="button"
            onClick={openLanguageModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#F0E1E1] hover:border-[#A20D38]/40 bg-white hover:bg-[#FCEDEC]/50 text-xs font-semibold text-[#30232A] transition-all active:scale-95 shadow-2xs cursor-pointer"
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
              className="flex items-center gap-2.5 pl-2 py-1 pr-2 rounded-full hover:bg-white/80 active:scale-95 transition-all border border-transparent hover:border-[#F0E1E1] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-[#880D32] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                {initials}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-[#30232A] leading-tight">
                  {user?.full_name ? translateEntityName(user.full_name, language) : 'Bhavna Mehta'}
                </p>
                <p className="text-[10px] text-[#786773] font-medium leading-none mt-0.5">
                  {role === 'admin' ? (isPrimaryAdmin ? (language === 'gu' ? 'પ્રાથમિક એડમિન' : 'Primary Admin') : 'Admin') : 'Manager'}
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
                  className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-lg border border-[#F0E1E1] py-1.5 z-50 animate-fade-in"
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-[#F0E1E1]">
                    <p className="text-xs font-bold text-[#30232A] truncate">
                      {user?.full_name ? translateEntityName(user.full_name, language) : 'User'}
                    </p>
                    <p className="text-[11px] text-[#786773] truncate">{user?.email || ''}</p>
                    <p className="text-[10px] font-semibold text-[#A20D38] truncate mt-0.5">
                      {companyName} ({companyCode})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#30232A] hover:bg-[#FCEDEC] hover:text-[#A20D38] transition-colors cursor-pointer"
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
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
