import React from 'react';
import { Languages, Check, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Language } from '../../utils/translations';

export const LanguageSelectModal: React.FC = () => {
  const { language, setLanguage, isLanguageModalOpen, closeLanguageModal, t } = useLanguage();

  if (!isLanguageModalOpen) return null;

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    closeLanguageModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-6">
        {/* Header with Icon */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-brand-600 to-rose-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
            <Languages className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Choose Language / ભાષા પસંદ કરો
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto">
            Please choose your preferred language to continue in BandhSetu
            <br />
            <span className="font-medium text-slate-600">
              બાંધસેતુ વાપરવા માટે તમારી ભાષા પસંદ કરો
            </span>
          </p>
        </div>

        {/* 2 Big Language Option Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Option 1: English */}
          <button
            type="button"
            onClick={() => handleSelect('en')}
            className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all text-center relative group active:scale-95 ${
              language === 'en'
                ? 'border-brand-600 bg-brand-50/50 shadow-sm ring-2 ring-brand-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
            }`}
          >
            {language === 'en' && (
              <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
            )}
            <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-brand-100 group-hover:text-brand-700 text-slate-700 font-bold text-xl flex items-center justify-center transition-colors mb-2">
              A
            </div>
            <div className="font-bold text-slate-900 text-base">English</div>
            <div className="text-xs text-slate-500 mt-0.5">Default English</div>
          </button>

          {/* Option 2: Gujarati */}
          <button
            type="button"
            onClick={() => handleSelect('gu')}
            className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all text-center relative group active:scale-95 ${
              language === 'gu'
                ? 'border-brand-600 bg-brand-50/50 shadow-sm ring-2 ring-brand-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
            }`}
          >
            {language === 'gu' && (
              <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
            )}
            <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-brand-100 group-hover:text-brand-700 text-slate-700 font-bold text-xl flex items-center justify-center transition-colors mb-2">
              અ
            </div>
            <div className="font-bold text-slate-900 text-base">ગુજરાતી</div>
            <div className="text-xs text-slate-500 mt-0.5">Gujarati language</div>
          </button>
        </div>

        {/* Footer info & close */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={closeLanguageModal}
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm active:scale-95"
          >
            {language === 'gu' ? 'ચાલુ રાખો (Continue)' : 'Continue in ' + (language === 'en' ? 'English' : 'ગુજરાતી')}
          </button>
        </div>
      </div>
    </div>
  );
};
