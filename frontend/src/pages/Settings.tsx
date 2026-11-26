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
  Building2,
  Clock,
  Calendar,
  AlertTriangle,
  ShieldAlert,
  Trash2,
  PowerOff,
  RefreshCw,
} from 'lucide-react';
import { Card, Button, Input } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../hooks/useToast';
import { api, SMTPConfigResponse, CompanyResponse } from '../services/api';
import { SMTPConfigModal } from '../components/auth/SMTPConfigModal';

export const Settings: React.FC = () => {
  const { user, role, isPrimaryAdmin, updateUserSession, logout } = useAuth();
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

  // Company & Operational Settings State (Admin Only)
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [legalName, setLegalName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [operatingStart, setOperatingStart] = useState('08:00');
  const [operatingEnd, setOperatingEnd] = useState('20:00');
  const [operatingDays, setOperatingDays] = useState('Mon,Tue,Wed,Thu,Fri,Sat');
  const [allowWeekend, setAllowWeekend] = useState(false);
  const [isUpdatingCompany, setIsUpdatingCompany] = useState(false);

  // Suspension & Deletion Modals State
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendPassword, setSuspendPassword] = useState('');
  const [isSuspending, setIsSuspending] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationPhrase, setDeleteConfirmationPhrase] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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

    if (role === 'admin') {
      api.getMyCompany().then((comp) => {
        setCompany(comp);
        setLegalName(comp.legal_name || '');
        setGstNumber(comp.gst_number || '');
        setCompanyPhone(comp.phone || '');
        setCompanyEmail(comp.email || '');
        setOperatingStart(comp.operating_hours_start || '08:00');
        setOperatingEnd(comp.operating_hours_end || '20:00');
        setOperatingDays(comp.operating_days || 'Mon,Tue,Wed,Thu,Fri,Sat');
        setAllowWeekend(Boolean(comp.allow_manager_weekend_access));
      }).catch(() => {});
    }

    // Fetch SMTP status
    api.getSMTPConfig().then(setSmtpStatus).catch(() => {});
  }, [user, role]);

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

      {/* REUSABLE SMTP CONFIGURATION MODAL */}
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

      {/* -------------------------------------------------------------------- */}
      {/* COMPANY PROTECTION, OPERATING HOURS & DISASTER RECOVERY CARD (ADMIN) */}
      {/* -------------------------------------------------------------------- */}
      {role === 'admin' && company && (
        <Card className="p-6 sm:p-8 border-[#F0E1E1] rounded-3xl shadow-2xs space-y-6 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#F0E1E1] pb-4 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#FCEDEC] text-[#A20D38]">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-lg font-bold text-[#30232A]">
                    {company.name}
                  </h2>
                  <span className="font-mono text-xs font-bold bg-[#FCEDEC] text-[#A20D38] px-2.5 py-0.5 rounded-full border border-[#F0E1E1]">
                    {company.code}
                  </span>
                  {isPrimaryAdmin && (
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 inline-flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-amber-600" />
                      <span>{language === 'gu' ? 'મુખ્ય સંચાલક' : 'Primary Admin'}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'gu'
                    ? 'કંપની સ્તરની સુરક્ષા, કાર્યકારી કલાકો અને ડેટા અલગતા'
                    : 'Company-Level Protection, Operating Hours & Data Isolation'}
                </p>
              </div>
            </div>

            <div>
              {company.status === 'Suspended' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Operations Suspended</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Active & Verified</span>
                </span>
              )}
            </div>
          </div>

          {/* Form: Company Operational Settings */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setIsUpdatingCompany(true);
              try {
                const updated = await api.updateMyCompany({
                  legal_name: legalName,
                  gst_number: gstNumber,
                  phone: companyPhone,
                  email: companyEmail,
                  operating_hours_start: operatingStart,
                  operating_hours_end: operatingEnd,
                  operating_days: operatingDays,
                  allow_manager_weekend_access: allowWeekend,
                });
                setCompany(updated);
                showToast({
                  type: 'success',
                  title: language === 'gu' ? 'કંપની સેટિંગ્સ સાચવી' : 'Settings Saved',
                  message:
                    language === 'gu'
                      ? 'કંપનીના કાર્યકારી નિયમો સફળતાપૂર્વક અપડેટ થયા.'
                      : 'Company operational rules and settings updated successfully.',
                });
              } catch (err: any) {
                showToast({
                  type: 'error',
                  title: 'Update Failed',
                  message: err.message || 'Failed to update company settings.',
                });
              } finally {
                setIsUpdatingCompany(false);
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label={language === 'gu' ? 'કાયદેસરનું બિઝનેસ નામ' : 'Legal Business Name'}
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="e.g. Vinchhi Bandhej Creations Pvt Ltd"
                />
              </div>

              <div>
                <Input
                  label={language === 'gu' ? 'GST / ટેક્સ નંબર (જો હોય તો)' : 'GST / Tax Registration Number'}
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. 24AAAAA0000A1Z5"
                />
              </div>

              <div>
                <Input
                  label={language === 'gu' ? 'બિઝનેસ સંપર્ક નંબર' : 'Registered Business Phone'}
                  type="text"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  placeholder="e.g. +91 98250 12345"
                  leftIcon={<Phone className="w-4 h-4" />}
                />
              </div>

              <div>
                <Input
                  label={language === 'gu' ? 'બિઝનેસ ઇમેઇલ' : 'Registered Business Email'}
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="e.g. contact@vinchhibandhej.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                />
              </div>
            </div>

            {/* Operational Rules (Operating Hours & Days) */}
            <div className="p-4 rounded-2xl bg-[#FFF9F6] border border-[#F0E1E1] space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#A20D38] uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                <span>
                  {language === 'gu'
                    ? 'વર્કશોપ કાર્યકારી કલાકો અને નિયમો (કંપની મુજબ)'
                    : 'Workshop Operating Hours & Access Rules'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    {language === 'gu' ? 'શરૂ થવાનો સમય (IST)' : 'Daily Opening Time'}
                  </label>
                  <input
                    type="time"
                    value={operatingStart}
                    onChange={(e) => setOperatingStart(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-[#F0E1E1] text-[#30232A] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#A20D38]/20"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    {language === 'gu' ? 'બંધ થવાનો સમય (IST)' : 'Daily Closing Time'}
                  </label>
                  <input
                    type="time"
                    value={operatingEnd}
                    onChange={(e) => setOperatingEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-[#F0E1E1] text-[#30232A] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#A20D38]/20"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    {language === 'gu' ? 'કામકાજના દિવસો' : 'Working Days (Comma-separated)'}
                  </label>
                  <input
                    type="text"
                    value={operatingDays}
                    onChange={(e) => setOperatingDays(e.target.value)}
                    placeholder="Mon,Tue,Wed,Thu,Fri,Sat"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-[#F0E1E1] text-[#30232A] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#A20D38]/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 text-xs">
                <input
                  type="checkbox"
                  id="allowWeekendToggle"
                  checked={allowWeekend}
                  onChange={(e) => setAllowWeekend(e.target.checked)}
                  className="w-4 h-4 rounded text-[#A20D38] border-gray-300 focus:ring-[#A20D38]"
                />
                <label htmlFor="allowWeekendToggle" className="text-slate-700 font-medium cursor-pointer">
                  {language === 'gu'
                    ? 'રવિવારે / વીકેન્ડમાં મેનેજરોને લોગિન કરવાની મંજૂરી આપો'
                    : 'Allow workshop managers to access platform on weekends / off-days'}
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isUpdatingCompany}
                icon={<Save className="w-4 h-4" />}
              >
                {language === 'gu' ? 'કંપની સેટિંગ્સ સાચવો' : 'Save Company Rules'}
              </Button>
            </div>
          </form>

          {/* Primary Admin Exclusive: Company Suspension & Danger Zone */}
          {isPrimaryAdmin && (
            <div className="pt-4 border-t border-rose-100 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-800 uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>
                  {language === 'gu' ? 'કંપની સંરક્ષણ અને સુરક્ષા નિયંત્રણ' : 'Company Protection & Danger Zone (Primary Admin Only)'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Suspension Box */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col justify-between gap-3 text-xs">
                  <div>
                    <h3 className="font-bold text-amber-900 text-sm">
                      {company.status === 'Suspended'
                        ? language === 'gu' ? 'કંપની સક્રિય કરો' : 'Reactivate Company Operations'
                        : language === 'gu' ? 'કંપની કામકાજ સ્થગિત (Suspend) કરો' : 'Suspend Company Operations'}
                    </h3>
                    <p className="text-amber-800/80 mt-1 leading-relaxed">
                      {language === 'gu'
                        ? 'કંપની સસ્પેન્ડ કરવાથી બધા યુઝરો/મેનેજરોનું લોગિન બંધ થશે, પરંતુ ૧૦૦% તમામ ડેટા, કારીગરો અને હિસાબો સંપૂર્ણ સુરક્ષિત રહેશે.'
                        : 'Blocks all active manager logins and halts operations while permanently preserving 100% of artisans, khatas, and transaction records.'}
                    </p>
                  </div>

                  <div>
                    {company.status === 'Suspended' ? (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        icon={<RefreshCw className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setSuspendPassword('');
                          setShowSuspendModal(true);
                        }}
                      >
                        {language === 'gu' ? 'કંપની ફરી ચાલુ કરો' : 'Reactivate Company'}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-amber-300 text-amber-800 hover:bg-amber-100"
                        icon={<PowerOff className="w-3.5 h-3.5 text-amber-700" />}
                        onClick={() => {
                          setSuspendReason('');
                          setSuspendPassword('');
                          setShowSuspendModal(true);
                        }}
                      >
                        {language === 'gu' ? 'સસ્પેન્ડ કરો' : 'Suspend Company'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Deletion Box */}
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex flex-col justify-between gap-3 text-xs">
                  <div>
                    <h3 className="font-bold text-rose-900 text-sm">
                      {language === 'gu' ? 'કંપની બંધ અને ડિલીટ કરો' : 'Close & Delete Company'}
                    </h3>
                    <p className="text-rose-800/80 mt-1 leading-relaxed">
                      {language === 'gu'
                        ? 'મજબૂત સુરક્ષા ચકાસણી: ફક્ત મુખ્ય એડમિન પાસવર્ડ અને કન્ફર્મેશન શબ્દ દાખલ કર્યા પછી જ બંધ કરી શકાશે. કારીગરો પાસે બાકી માલ હશે તો ડિલીટ નહીં થાય.'
                        : 'Permanent closure requires strong confirmation and Primary Admin password. Blocked automatically if any pieces are pending in artisan custody.'}
                    </p>
                  </div>

                  <div>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setDeleteConfirmationPhrase('');
                        setDeletePassword('');
                        setShowDeleteModal(true);
                      }}
                    >
                      {language === 'gu' ? 'કંપની બંધ કરો' : 'Delete Company'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* SUSPENSION MODAL */}
      {showSuspendModal && company && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#F0E1E1] space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 rounded-2xl bg-amber-100">
                <PowerOff className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#30232A]">
                  {company.status === 'Suspended' ? 'Reactivate Company' : 'Suspend Company'}
                </h3>
                <p className="text-xs text-slate-500">{company.name} ({company.code})</p>
              </div>
            </div>

            {company.status !== 'Suspended' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Suspension (Required)
                </label>
                <textarea
                  rows={2}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. Annual workshop stocktaking and audit"
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Admin Password
              </label>
              <Input
                type="password"
                value={suspendPassword}
                onChange={(e) => setSuspendPassword(e.target.value)}
                placeholder="Enter your administrator password"
                leftIcon={<Lock className="w-4 h-4" />}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSuspendModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={company.status === 'Suspended' ? 'primary' : 'danger'}
                size="sm"
                isLoading={isSuspending}
                onClick={async () => {
                  if (!suspendPassword.trim()) {
                    showToast({ type: 'error', title: 'Required', message: 'Please enter your password.' });
                    return;
                  }
                  setIsSuspending(true);
                  try {
                    if (company.status === 'Suspended') {
                      await api.reactivateMyCompany({ password: suspendPassword });
                      showToast({ type: 'success', title: 'Reactivated', message: 'Company operations have been resumed.' });
                    } else {
                      if (!suspendReason.trim()) {
                        showToast({ type: 'error', title: 'Required', message: 'Please provide a reason for suspension.' });
                        setIsSuspending(false);
                        return;
                      }
                      await api.suspendMyCompany({ reason: suspendReason, password: suspendPassword });
                      showToast({ type: 'success', title: 'Suspended', message: 'Company operations suspended. All data preserved.' });
                    }
                    const fresh = await api.getMyCompany();
                    setCompany(fresh);
                    setShowSuspendModal(false);
                  } catch (err: any) {
                    showToast({ type: 'error', title: 'Error', message: err.message || 'Operation failed.' });
                  } finally {
                    setIsSuspending(false);
                  }
                }}
              >
                {company.status === 'Suspended' ? 'Confirm Reactivation' : 'Confirm Suspension'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STRONG DELETION MODAL */}
      {showDeleteModal && company && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-2xl bg-rose-100">
                <AlertTriangle className="w-5 h-5 text-rose-700" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-rose-900">
                  Strong Confirmation: Close Company
                </h3>
                <p className="text-xs text-rose-700 font-mono">{company.name} ({company.code})</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1.5">
              <p className="font-bold">⚠️ Warning: Company closure will revoke all access immediately.</p>
              <p>Deletion will be strictly rejected if any fabric pieces are still pending in artisan custody.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Type <span className="font-mono font-bold text-rose-700">DELETE {company.code}</span> to confirm:
              </label>
              <Input
                type="text"
                value={deleteConfirmationPhrase}
                onChange={(e) => setDeleteConfirmationPhrase(e.target.value)}
                placeholder={`DELETE ${company.code}`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Admin Password
              </label>
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your administrator password"
                leftIcon={<Lock className="w-4 h-4" />}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                isLoading={isDeleting}
                onClick={async () => {
                  if (deleteConfirmationPhrase.trim().toUpperCase() !== `DELETE ${company.code}`.toUpperCase() &&
                      deleteConfirmationPhrase.trim().toUpperCase() !== `DELETE ${company.name}`.toUpperCase()) {
                    showToast({
                      type: 'error',
                      title: 'Confirmation Mismatch',
                      message: `Please type exactly "DELETE ${company.code}" to confirm.`,
                    });
                    return;
                  }
                  if (!deletePassword.trim()) {
                    showToast({ type: 'error', title: 'Password Required', message: 'Please enter your administrator password.' });
                    return;
                  }
                  setIsDeleting(true);
                  try {
                    await api.deleteMyCompany({
                      confirmation_phrase: deleteConfirmationPhrase,
                      password: deletePassword,
                    });
                    showToast({
                      type: 'success',
                      title: 'Company Deleted',
                      message: 'The company has been closed and deleted. Redirecting...',
                    });
                    setShowDeleteModal(false);
                    setTimeout(() => {
                      logout();
                    }, 1500);
                  } catch (err: any) {
                    showToast({
                      type: 'error',
                      title: 'Deletion Failed',
                      message: err.message || 'Failed to delete company.',
                    });
                  } finally {
                    setIsDeleting(false);
                  }
                }}
              >
                Authorise Deletion
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
