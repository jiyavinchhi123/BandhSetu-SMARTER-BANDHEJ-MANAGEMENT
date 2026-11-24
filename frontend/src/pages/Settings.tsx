import React, { useState, useEffect } from 'react';
import {
  Save,
  KeyRound,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Settings as SettingsIcon,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Card, Button, Input } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../hooks/useToast';
import { api, SMTPConfigResponse } from '../services/api';
import { SMTPConfigModal } from '../components/auth/SMTPConfigModal';

export const Settings: React.FC = () => {
  const { user, updateUserSession } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  // Profile & Login Credentials Form State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [credentialSuccess, setCredentialSuccess] = useState<string | null>(null);

  // SMTP Settings State
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<SMTPConfigResponse | null>(null);

  // Synchronize when user auth loads/updates
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      setEmail(user.email || '');
    }

    // Fetch SMTP status
    api.getSMTPConfig().then(setSmtpStatus).catch(() => {});
  }, [user]);

  // Handle Login Credentials Update
  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredentialError(null);
    setCredentialSuccess(null);

    // Validations
    if (!fullName.trim()) {
      setCredentialError(
        language === 'gu' ? 'કૃપા કરીને પૂરું નામ દાખલ કરો.' : 'Please enter your full name.'
      );
      return;
    }

    if (!phone.trim()) {
      setCredentialError(
        language === 'gu' ? 'કૃપા કરીને મોબાઇલ નંબર દાખલ કરો.' : 'Please enter your mobile number.'
      );
      return;
    }

    if (!email.trim()) {
      setCredentialError(
        language === 'gu' ? 'કૃપા કરીને ઇમેઇલ દાખલ કરો.' : 'Please enter your email address.'
      );
      return;
    }

    if (password.trim()) {
      if (!oldPassword.trim()) {
        setCredentialError(
          language === 'gu'
            ? 'નવો પાસવર્ડ બદલવા માટે કૃપા કરીને તમારો જૂનો પાસવર્ડ દાખલ કરો.'
            : 'Please enter your current (old) password to set a new password.'
        );
        return;
      }
      if (password.trim().length < 4) {
        setCredentialError(
          language === 'gu'
            ? 'નવો પાસવર્ડ ઓછામાં ઓછો 4 અક્ષરોનો હોવો જોઈએ.'
            : 'New password must be at least 4 characters long.'
        );
        return;
      }
      if (password !== confirmPassword) {
        setCredentialError(
          language === 'gu'
            ? 'નવો પાસવર્ડ અને કન્ફર્મ પાસવર્ડ સરખા નથી.'
            : 'New password and confirm password do not match.'
        );
        return;
      }
    }

    setIsUpdatingCredentials(true);

    try {
      const res = await api.updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        old_password: oldPassword.trim() ? oldPassword.trim() : undefined,
        password: password.trim() ? password.trim() : undefined,
      });

      // Update in context & localStorage
      updateUserSession(res.user, res.access_token);

      setOldPassword('');
      setPassword('');
      setConfirmPassword('');

      const successMsg =
        language === 'gu'
          ? 'લૉગિન ઓળખપત્રો સફળતાપૂર્વક અપડેટ થયા.'
          : res.message || 'Login credentials updated successfully.';

      setCredentialSuccess(successMsg);
      showToast({
        type: 'success',
        title: language === 'gu' ? 'ઓળખપત્રો અપડેટ થયા' : 'Credentials Updated',
        message: successMsg,
      });
    } catch (err: any) {
      const errMsg =
        err.message ||
        (language === 'gu'
          ? 'ઓળખપત્રો અપડેટ કરવામાં ભૂલ આવી. કૃપા કરીને ફરી પ્રયાસ કરો.'
          : 'Failed to update credentials.');
      setCredentialError(errMsg);
      showToast({
        type: 'error',
        title: language === 'gu' ? 'ભૂલ' : 'Update Failed',
        message: errMsg,
      });
    } finally {
      setIsUpdatingCredentials(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#30232A] tracking-tight">
          {t('settings', 'Settings')}
        </h1>
        <p className="text-xs text-[#786773] mt-0.5">Manage your workshop profile and security credentials</p>
      </div>

      {/* LOGIN CREDENTIALS UPDATE CARD */}
      <Card className="p-6 sm:p-8 border-[#F0E1E1] rounded-3xl shadow-2xs space-y-5 bg-white">
        <div className="flex items-center justify-between border-b border-[#F0E1E1] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#FCEDEC] text-[#A20D38]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-[#30232A]">
                {t('credentials_update_title', 'Login Credentials & Profile')}
              </h2>
              <p className="text-xs text-slate-500">
                {t(
                  'credentials_update_subtitle',
                  'Update Name, Mobile No, Email ID, and Password'
                )}
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            {user?.role === 'admin' ? 'Owner / Admin' : 'Manager'}
          </span>
        </div>

        {credentialError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{credentialError}</div>
          </div>
        )}

        {credentialSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{credentialSuccess}</div>
          </div>
        )}

        <form onSubmit={handleUpdateCredentials} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Update Name */}
            <div>
              <Input
                label={t('field_full_name', 'Update Name (Full Name)')}
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Bhavna Mehta"
                leftIcon={<User className="w-4 h-4" />}
              />
            </div>

            {/* Mobile No */}
            <div>
              <Input
                label={t('field_mobile_no', 'Mobile No')}
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9426927175"
                leftIcon={<Phone className="w-4 h-4" />}
              />
            </div>

            {/* Email ID */}
            <div className="sm:col-span-2">
              <Input
                label={t('field_email_id', 'Email ID')}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@bandhej.com"
                leftIcon={<Mail className="w-4 h-4" />}
              />
            </div>

            {/* Current (Old) Password */}
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                {t('field_old_password', 'Current (Old) Password')}
              </label>
              <Input
                type={showOldPassword ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder={
                  language === 'gu'
                    ? 'વર્તમાન (જૂનો) પાસવર્ડ દાખલ કરો (પાસવર્ડ બદલવા માટે જરૂરી)'
                    : 'Enter current password (required only if changing password)'
                }
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer transition-colors"
                    title={showOldPassword ? 'Hide password' : 'Show password'}
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                {t('field_new_password', 'New Password')}
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  language === 'gu'
                    ? 'નવો પાસવર્ડ (બદલવો હોય તો જ)'
                    : 'New password (optional)'
                }
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                {t('field_confirm_password', 'Confirm New Password')}
              </label>
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={
                  language === 'gu'
                    ? 'પાસવર્ડ ફરીથી લખો'
                    : 'Re-enter new password'
                }
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer transition-colors"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
              />
            </div>
          </div>

          <p className="text-xs text-slate-400">
            {t(
              'password_hint',
              'Leave password blank if you do not want to change it.'
            )}
          </p>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isUpdatingCredentials}
              icon={<Save className="w-4 h-4" />}
              className="w-full sm:w-auto justify-center"
            >
              {t('save_credentials_btn', 'Update Login Credentials')}
            </Button>
          </div>
        </form>
      </Card>

      {/* GMAIL SMTP EMAIL DELIVERY CONFIGURATION CARD */}
      <Card className="p-6 sm:p-8 border-[#F0E1E1] rounded-3xl shadow-2xs space-y-5 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#F0E1E1] pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#FCEDEC] text-[#A20D38]">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-[#30232A]">
                {language === 'gu'
                  ? 'ઇમેઇલ OTP ડિલિવરી સેટિંગ્સ'
                  : 'Email & OTP Delivery Settings'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'gu'
                  ? '૧૦૦% ફ્રી લાઇફટાઇમ Google Gmail SMTP (પાસવર્ડ રીસેટ કોડ માટે)'
                  : '100% Free Lifetime Gmail SMTP for password reset codes'}
              </p>
            </div>
          </div>

          <div>
            {smtpStatus?.is_configured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Live Connected ({smtpStatus.masked_user})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Demo Mode (Local OTP)</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-[#FFF9F6] border border-[#F0E1E1] text-xs">
          <div>
            <span className="text-slate-500 font-medium">Provider:</span>
            <p className="font-bold text-[#30232A] mt-0.5">Google Gmail SMTP</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Host & Port:</span>
            <p className="font-mono text-[#30232A] mt-0.5">smtp.gmail.com:587 (TLS)</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Cost / Charges:</span>
            <p className="font-bold text-emerald-700 mt-0.5">₹0 (100% Free Lifetime)</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <p className="text-xs text-[#786773] leading-relaxed max-w-xl">
            {language === 'gu'
              ? 'તમારા એકાઉન્ટ માટે Google App Passwords નો ઉપયોગ કરીને તમે તમારા ગ્રાહકો કે મેનેજરોને અસલી ઇમેઇલ મોકલી શકો છો.'
              : 'Add or update your 16-character Google App Password to deliver actual verification codes to registered inboxes.'}
          </p>

          <Button
            type="button"
            variant="outline"
            size="md"
            icon={<SettingsIcon className="w-4 h-4 text-[#A20D38]" />}
            onClick={() => setShowSmtpModal(true)}
            className="shrink-0"
          >
            {smtpStatus?.is_configured
              ? language === 'gu'
                ? 'App Password બદલો'
                : 'Change App Password'
              : language === 'gu'
              ? 'Gmail App Password ઉમેરો'
              : 'Add Gmail App Password'}
          </Button>
        </div>
      </Card>

      {/* Reusable SMTP Configuration Modal */}
      <SMTPConfigModal
        isOpen={showSmtpModal}
        onClose={() => setShowSmtpModal(false)}
        onSaved={(cfg) => {
          setSmtpStatus(cfg);
          showToast({
            type: 'success',
            title: language === 'gu' ? 'SMTP અપડેટ થયું' : 'SMTP Configured',
            message:
              language === 'gu'
                ? 'Gmail SMTP સફળતાપૂર્વક કનેક્ટ થયું! હવે અસલી ઇમેઇલ આવશે.'
                : 'Gmail SMTP connected successfully! Real OTP emails are now enabled.',
          });
        }}
      />
    </div>
  );
};
