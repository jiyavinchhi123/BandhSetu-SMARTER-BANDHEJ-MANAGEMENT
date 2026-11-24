import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Sparkles,
  Server,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { Button, Input } from '../ui';
import { api, SMTPConfigResponse } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

interface SMTPConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (config: SMTPConfigResponse) => void;
}

export const SMTPConfigModal: React.FC<SMTPConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const { language } = useLanguage();

  const [smtpUser, setSmtpUser] = useState('jiya.vinchhi2412@gmail.com');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('BandhSetu Security');
  const [showPassword, setShowPassword] = useState(false);

  const [isConfigured, setIsConfigured] = useState(false);
  const [maskedUser, setMaskedUser] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingStatus, setIsFetchingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load existing status when opened
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsFetchingStatus(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    api
      .getSMTPConfig()
      .then((cfg) => {
        if (!mounted) return;
        setIsConfigured(cfg.is_configured);
        setMaskedUser(cfg.masked_user || null);
        if (cfg.smtp_user) setSmtpUser(cfg.smtp_user);
        if (cfg.smtp_from_name) setSmtpFromName(cfg.smtp_from_name);
      })
      .catch((err) => {
        console.warn('Could not load SMTP config:', err);
      })
      .finally(() => {
        if (mounted) setIsFetchingStatus(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUser = smtpUser.trim().toLowerCase();
    const cleanPassword = smtpPassword.trim().replace(/\s+/g, '');

    if (!cleanUser || !cleanUser.includes('@')) {
      setErrorMessage(
        language === 'gu'
          ? 'કૃપા કરીને માન્ય Gmail એડ્રેસ દાખલ કરો.'
          : 'Please enter a valid Gmail address.'
      );
      return;
    }

    if (!cleanPassword && !isConfigured) {
      setErrorMessage(
        language === 'gu'
          ? 'કૃપા કરીને તમારો ૧૬ અક્ષરનો Google App Password દાખલ કરો.'
          : 'Please enter your 16-character Google App Password.'
      );
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.saveSMTPConfig({
        smtp_user: cleanUser,
        smtp_password: cleanPassword || undefined,
        smtp_from_email: cleanUser,
        smtp_from_name: smtpFromName.trim() || 'BandhSetu Security',
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        smtp_tls: true,
        test_connection: true,
      });

      setIsConfigured(res.is_configured);
      setMaskedUser(res.masked_user || cleanUser);
      setSmtpPassword('');
      const successMsg =
        language === 'gu'
          ? 'Gmail SMTP સફળતાપૂર્વક કનેક્ટ થયું! હવે રીઅલ OTP ઇમેઇલ સીધા તમારા ઇનબૉક્સમાં આવશે.'
          : 'Gmail SMTP verified & saved successfully! Real OTP emails will now arrive in your inbox.';
      setSuccessMessage(successMsg);

      if (onSaved) onSaved(res);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          (language === 'gu'
            ? 'કનેક્શન અસફળ રહ્યું. કૃપા કરીને Google App Password ચકાસો.'
            : 'Connection failed. Please check your App Password.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#F0E1E1] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#A20D38] to-[#880D32] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold">
                {language === 'gu' ? 'Gmail OTP ડિલિવરી સેટિંગ્સ' : 'Gmail Email Delivery Setup'}
              </h3>
              <p className="text-xs text-[#FCEDEC]">
                {language === 'gu'
                  ? '૧૦૦% ફ્રી લાઇફટાઇમ ઇમેઇલ ડિલિવરી'
                  : '100% Free Lifetime OTP Delivery (Google SMTP)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Status Badge */}
          {isConfigured ? (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>
                    {language === 'gu' ? 'લાઇવ Gmail સક્રિય છે' : 'Live Gmail Delivery Active'}
                  </strong>
                  {maskedUser && ` (${maskedUser})`}
                </span>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-900">
                Connected
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  {language === 'gu'
                    ? 'હાલમાં ડેમો / ડેવલપમેન્ટ મોડ ચાલુ છે'
                    : 'Currently in Local Demo Mode'}
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  {language === 'gu'
                    ? 'તમારા પોતાના Gmail એકાઉન્ટમાંથી અસલી ઇમેઇલ મેળવવા માટે નીચે તમારો ૧૬ અક્ષરનો Google App Password ઉમેરો.'
                    : 'To receive real OTP emails directly in your inbox, add your 16-character Google App Password below.'}
                </p>
              </div>
            </div>
          )}

          {/* Quick 3-Step Guide Card */}
          <div className="p-4 rounded-2xl bg-[#FFF9F6] border border-[#F0E1E1] space-y-2.5 text-xs text-[#30232A]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#A20D38] flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                <Sparkles className="w-3.5 h-3.5" />
                {language === 'gu' ? 'સરળ ૩ પગલાંની માર્ગદર્શિકા' : 'Quick 3-Step Guide'}
              </span>
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#A20D38] hover:bg-[#880D32] text-white font-semibold text-[11px] transition-colors cursor-pointer shadow-xs"
              >
                <span>Google App Passwords</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <ol className="list-decimal list-inside space-y-1.5 text-slate-700 leading-relaxed text-[11.5px]">
              <li>
                {language === 'gu' ? (
                  <span>
                    બ્રાઉઝરમાં{' '}
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#A20D38] font-bold underline"
                    >
                      Google App Passwords
                    </a>{' '}
                    ખોલો <em>(Google Account માં 2-Step Verification ચાલુ હોવું જરૂરી છે)</em>.
                  </span>
                ) : (
                  <span>
                    Open{' '}
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#A20D38] font-bold underline"
                    >
                      Google App Passwords
                    </a>{' '}
                    in your browser <em>(make sure 2-Step Verification is ON)</em>.
                  </span>
                )}
              </li>
              <li>
                {language === 'gu'
                  ? 'App Name માં "BandhSetu" લખો અને "Create" પર ક્લિક કરો.'
                  : 'Type "BandhSetu" as the App Name and click "Create".'}
              </li>
              <li>
                {language === 'gu'
                  ? 'Google તમને ૧૬ અક્ષરનો પાસવર્ડ આપશે (દા.ત. abcd efgh ijkl mnop). તે નીચે દાખલ કરો.'
                  : 'Google will generate a 16-letter password (e.g., abcd efgh ijkl mnop). Paste it below.'}
              </li>
            </ol>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* Setup Form */}
          <form id="smtp-setup-form" onSubmit={handleSubmit} className="space-y-3.5">
            {/* Gmail User */}
            <Input
              label={language === 'gu' ? 'તમારું Gmail એડ્રેસ' : 'Your Gmail Address'}
              type="email"
              required
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              placeholder="e.g. jiya.vinchhi2412@gmail.com"
              leftIcon={<Mail className="w-4 h-4" />}
            />

            {/* App Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-700">
                  {language === 'gu' ? '૧૬ અક્ષરનો Google App Password' : '16-Letter Google App Password'}
                </label>
                <span className="text-[10.5px] text-slate-400 font-mono">
                  {isConfigured && !smtpPassword ? '(Existing active)' : '16 chars'}
                </span>
              </div>
              <Input
                type={showPassword ? 'text' : 'password'}
                required={!isConfigured}
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder={
                  isConfigured
                    ? language === 'gu'
                      ? 'સક્રિય છે — બદલવા માટે નવો પાસવર્ડ લખો'
                      : 'Active — leave blank to keep current'
                    : 'e.g. abcd efgh ijkl mnop'
                }
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                className="font-mono tracking-wider"
              />
            </div>

            {/* Sender Display Name */}
            <Input
              label={language === 'gu' ? 'મોકલનારનું નામ (Display Name)' : 'Sender Display Name'}
              type="text"
              value={smtpFromName}
              onChange={(e) => setSmtpFromName(e.target.value)}
              placeholder="BandhSetu Security"
              leftIcon={<ShieldCheck className="w-4 h-4" />}
            />

            {/* Port & Host Note */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono">
                <Server className="w-3.5 h-3.5 text-slate-500" />
                <span>Host: smtp.gmail.com:587 (TLS)</span>
              </div>
              <span className="text-emerald-700 font-semibold">100% Free Lifetime</span>
            </div>
          </form>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            {language === 'gu' ? 'બંધ કરો' : 'Cancel'}
          </Button>

          <Button
            type="submit"
            form="smtp-setup-form"
            variant="primary"
            size="md"
            isLoading={isLoading}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            {language === 'gu' ? 'સેવ કરો અને ટેસ્ટ કરો' : 'Save & Verify Connection'}
          </Button>
        </div>
      </div>
    </div>
  );
};
