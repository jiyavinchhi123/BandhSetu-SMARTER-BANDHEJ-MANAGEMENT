import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Phone,
  Languages,
  User,
  Mail,
  UserPlus,
  CheckCircle2,
  ArrowLeft,
  ShieldAlert,
  KeyRound,
  Smartphone,
  RefreshCw,
  ShieldCheck,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button, Input, Card } from '../components/ui';
import { APP_NAME, APP_TAGLINE } from '../utils/constants';
import { api } from '../services/api';
import { BandhaniLogo } from '../components/common/BandhaniMotif';
import { SMTPConfigModal } from '../components/auth/SMTPConfigModal';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  // Mode: login vs register vs forgot_password
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password'>('login');

  // Login Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Register Form State
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  // Forgot Password Multi-Step State
  const [forgotStep, setForgotStep] = useState<'phone' | 'otp' | 'new_password' | 'success'>('phone');
  const [forgotChannel, setForgotChannel] = useState<'email' | 'sms'>('email');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [maskedRecipient, setMaskedRecipient] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [showSmtpModal, setShowSmtpModal] = useState(false);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const from = (location.state as any)?.from?.pathname || '/';

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage(
        language === 'gu'
          ? 'કૃપા કરીને મોબાઇલ/ઇમેઇલ અને પાસવર્ડ બંને દાખલ કરો.'
          : 'Please enter both your email/phone and password.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const loginRes = await login(identifier.trim(), password);
      const userRole = loginRes?.role || localStorage.getItem('bandhej_user_role');

      // Requirement: When logging in, Admin must first open Dashboard ('/')
      if (userRole === 'admin') {
        navigate('/', { replace: true });
      } else {
        // Manager lands directly on Workers
        navigate('/workers', { replace: true });
      }
    } catch (err: any) {
      if (err.code === 'ACCOUNT_PENDING_APPROVAL') {
        setErrorMessage(
          language === 'gu'
            ? 'તમારું મેનેજર એકાઉન્ટ એડમિનની મંજૂરી માટે બાકી છે. એડમિન દ્વારા મંજૂર થયા પછી જ તમે લૉગિન કરી શકશો.'
            : 'Manager account registration is pending Admin approval. You will be able to log in once approved by the administrator.'
        );
      } else if (err.code === 'ACCESS_HOURS_EXPIRED' || err.code === 'ACCOUNT_LOCKED') {
        navigate('/access-locked', { replace: true });
      } else {
        setErrorMessage(
          language === 'gu'
            ? 'ખોટા ઓળખપત્રો. કૃપા કરીને મોબાઇલ/ઇમેઇલ અને પાસવર્ડ ચકાસો.'
            : err.message || 'Login failed. Please verify credentials.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regFullName.trim()) {
      setErrorMessage(
        language === 'gu' ? 'કૃપા કરીને પૂરું નામ દાખલ કરો.' : 'Please enter your full name.'
      );
      return;
    }

    if (!regPhone.trim()) {
      setErrorMessage(
        language === 'gu' ? 'કૃપા કરીને મોબાઇલ નંબર દાખલ કરો.' : 'Please enter your mobile number.'
      );
      return;
    }

    if (!regEmail.trim()) {
      setErrorMessage(
        language === 'gu' ? 'કૃપા કરીને ઇમેઇલ દાખલ કરો.' : 'Please enter your email address.'
      );
      return;
    }

    if (!regPassword.trim() || regPassword.trim().length < 4) {
      setErrorMessage(
        language === 'gu'
          ? 'પાસવર્ડ ઓછામાં ઓછો 4 અક્ષરોનો હોવો જોઈએ.'
          : 'Password must be at least 4 characters long.'
      );
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage(
        language === 'gu'
          ? 'પાસવર્ડ અને કન્ફર્મ પાસવર્ડ સરખા નથી.'
          : 'Password and confirm password do not match.'
      );
      return;
    }

    setIsSubmittingReg(true);

    try {
      await api.registerManager({
        full_name: regFullName.trim(),
        phone: regPhone.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
      });

      // Clear register inputs
      setRegFullName('');
      setRegPhone('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirmPassword('');
      setAuthMode('login');

      setSuccessMessage(
        language === 'gu'
          ? 'રજીસ્ટ્રેશન સફળતાપૂર્વક સબમિટ થયું! તમારું એકાઉન્ટ એડમિનની મંજૂરી માટે બાકી છે. એડમિન દ્વારા મંજૂર થયા પછી જ તમે લૉગિન કરી શકશો.'
          : 'Registration submitted successfully! Your account is pending Admin approval. You will be able to log in once approved by the administrator.'
      );
    } catch (err: any) {
      setErrorMessage(
        err.message ||
        (language === 'gu'
          ? 'રજીસ્ટ્રેશન કરવામાં ભૂલ આવી. કૃપા કરીને ફરી પ્રયાસ કરો.'
          : 'Registration failed. Please check the details and try again.')
      );
    } finally {
      setIsSubmittingReg(false);
    }
  };

  // Handle Forgot Password - Request OTP (Email)
  const handleRequestOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setErrorMessage(
        language === 'gu'
          ? 'કૃપા કરીને તમારું રજીસ્ટર્ડ ઇમેઇલ એડ્રેસ દાખલ કરો.'
          : 'Please enter your registered email address.'
      );
      return;
    }

    setIsForgotLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await api.requestPasswordResetOTP(forgotIdentifier.trim(), 'email');
      setMaskedRecipient(res.masked_recipient || res.masked_phone || forgotIdentifier.trim());
      setCooldownSeconds(res.cooldown_seconds || 60);
      if (res.dev_otp) {
        setDevOtpHint(res.dev_otp);
      }
      setSuccessMessage(res.message);
      setForgotStep('otp');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification code.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  // Handle Forgot Password - Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setErrorMessage(
        language === 'gu'
          ? 'કૃપા કરીને ૬ અંકનો ચકાસણી કોડ દાખલ કરો.'
          : 'Please enter the 6-digit verification code.'
      );
      return;
    }

    setIsForgotLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await api.verifyPasswordResetOTP(forgotIdentifier.trim(), otpCode.trim());
      setResetToken(res.reset_token);
      setSuccessMessage(
        language === 'gu'
          ? 'ચકાસણી સફળ થઈ! કૃપા કરીને નવો પાસવર્ડ બનાવો.'
          : res.message
      );
      setForgotStep('new_password');
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP verification failed.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  // Handle Forgot Password - Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setErrorMessage(
        language === 'gu'
          ? 'કૃપા કરીને નવો પાસવર્ડ દાખલ કરો.'
          : 'Please enter your new password.'
      );
      return;
    }
    if (newPassword.trim().length < 6) {
      setErrorMessage(
        language === 'gu'
          ? 'પાસવર્ડ ઓછામાં ઓછો ૬ અક્ષરનો હોવો જોઈએ.'
          : 'Password must be at least 6 characters long.'
      );
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage(
        language === 'gu'
          ? 'પાસવર્ડ અને કન્ફર્મ પાસવર્ડ મેળ ખાતા નથી.'
          : 'New password and confirm password do not match.'
      );
      return;
    }

    setIsForgotLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await api.resetPasswordWithOTP(forgotIdentifier.trim(), resetToken, newPassword.trim());
      setSuccessMessage(
        language === 'gu'
          ? 'પાસવર્ડ સફળતાપૂર્વક બદલાઈ ગયો છે! સુરક્ષા માટે અગાઉના તમામ લૉગિન સત્રો રદ કરવામાં આવ્યા છે.'
          : res.message
      );
      setForgotStep('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const resetForgotState = () => {
    setAuthMode('login');
    setForgotStep('phone');
    setForgotChannel('email');
    setForgotIdentifier('');
    setMaskedRecipient('');
    setOtpCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmNewPassword('');
    setDevOtpHint(null);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#FFF9F6] relative">
      {/* Top Language Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button
          type="button"
          onClick={() => setLanguage(language === 'gu' ? 'en' : 'gu')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#F0E1E1] hover:border-[#A20D38]/40 bg-white shadow-2xs text-xs font-semibold text-[#30232A] hover:text-[#A20D38] transition-all active:scale-95 cursor-pointer"
          title="Change Language / ભાષા બદલો"
        >
          <Languages className="w-3.5 h-3.5 text-[#A20D38]" />
          <span>{language === 'gu' ? 'ગુજરાતી' : 'English'}</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Main Card with Branding Inside */}
        <Card className="shadow-xl border-[#F0E1E1] p-6 sm:p-10 rounded-3xl bg-white">
          {/* Branding */}
          <div className="flex flex-col items-center text-center mb-6">
            <img
              src="/bandhsetu-logo.png"
              alt="BandhSetu — Smarter Bandhej Management"
              className="w-56 sm:w-64 max-w-full h-auto object-contain mb-2 filter drop-shadow-xs"
            />
            {language === 'gu' && (
              <p className="mt-1 text-xs text-[#786773] font-medium">
                બાંધેજ કારીગર અને હિસાબ સંચાલન
              </p>
            )}
          </div>

          {/* Success Notification */}
          {successMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* Error Notification */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {authMode === 'login' && (
            /* ==================================================== */
            /* VIEW 1: SIGN IN FORM                                 */
            /* ==================================================== */
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <Input
                label={language === 'gu' ? 'મોબાઇલ નંબર અથવા ઇમેઇલ' : 'Email Address or Mobile Number'}
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. +91 9426927175"
                leftIcon={<Phone className="w-4 h-4" />}
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs sm:text-sm font-medium text-slate-700">
                    {language === 'gu' ? 'પાસવર્ડ' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot_password');
                      setForgotStep('phone');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs font-semibold text-[#A20D38] hover:text-[#880D32] hover:underline cursor-pointer transition-colors"
                  >
                    {language === 'gu' ? 'પાસવર્ડ ભૂલી ગયા છો?' : 'Forgot Password?'}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={language === 'gu' ? 'પાસવર્ડ દાખલ કરો' : 'Enter your password'}
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
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={isLoading}
              >
                {language === 'gu' ? 'વર્કશોપમાં લૉગિન કરો' : 'Sign In to Workshop'}
              </Button>

              {/* Register / Create Account Link */}
              <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>
                    {language === 'gu'
                      ? 'ખાતું નથી? મેનેજર તરીકે રજીસ્ટ્રેશન કરો'
                      : "Don't have an account? Register as Manager"}
                  </span>
                </button>
              </div>
            </form>
          )}

          {authMode === 'register' && (
            /* ==================================================== */
            /* VIEW 2: MANAGER REGISTRATION FORM                    */
            /* ==================================================== */
            <form className="space-y-3.5" onSubmit={handleRegisterSubmit}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {language === 'gu' ? 'મેનેજર રજીસ્ટ્રેશન' : 'Manager Registration'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {language === 'gu' ? 'નવું એકાઉન્ટ બનાવો' : 'Create an authorized manager account'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{language === 'gu' ? 'પાછા જાવ' : 'Back'}</span>
                </button>
              </div>

              {/* Admin Approval Notice Banner */}
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-tight">
                  {language === 'gu'
                    ? 'નોંધ: નોંધણી પછી એડમિન દ્વારા મંજૂર થયા પછી જ તમે વર્કશોપમાં લૉગિન કરી શકશો.'
                    : 'Note: Registered manager accounts can only log in once approved by the administrator.'}
                </div>
              </div>

              {/* Full Name */}
              <Input
                label={language === 'gu' ? 'પૂરું નામ' : 'Full Name'}
                type="text"
                required
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                placeholder="e.g. Ramesh Patel"
                leftIcon={<User className="w-4 h-4" />}
              />

              {/* Mobile Number */}
              <Input
                label={language === 'gu' ? 'મોબાઇલ નંબર' : 'Mobile Number'}
                type="text"
                required
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                leftIcon={<Phone className="w-4 h-4" />}
              />

              {/* Email Address */}
              <Input
                label={language === 'gu' ? 'ઇમેઇલ એડ્રેસ' : 'Email Address'}
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="e.g. manager@bandhej.com"
                leftIcon={<Mail className="w-4 h-4" />}
              />

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  {language === 'gu' ? 'પાસવર્ડ' : 'Password'}
                </label>
                <Input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder={language === 'gu' ? 'ઓછામાં ઓછા 4 અક્ષરો' : 'At least 4 characters'}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer transition-colors"
                      title={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  {language === 'gu' ? 'પાસવર્ડ ફરીથી લખો' : 'Confirm Password'}
                </label>
                <Input
                  type={showRegConfirmPassword ? 'text' : 'password'}
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder={language === 'gu' ? 'પાસવર્ડ ફરીથી દાખલ કરો' : 'Re-enter password'}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer transition-colors"
                      title={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={isSubmittingReg}
              >
                {language === 'gu' ? 'એકાઉન્ટ રજીસ્ટર કરો' : 'Submit Registration'}
              </Button>

              {/* Back to Login Link */}
              <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  {language === 'gu'
                    ? 'પહેલેથી એકાઉન્ટ છે? લૉગિન કરો'
                    : 'Already have an account? Sign In'}
                </button>
              </div>
            </form>
          )}

          {authMode === 'forgot_password' && (
            /* ==================================================== */
            /* VIEW 3: FORGOT PASSWORD – EMAIL & MOBILE OTP          */
            /* ==================================================== */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#FCEDEC] text-[#A20D38] flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      {language === 'gu' ? 'પાસવર્ડ રીસેટ' : 'Reset Password'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {language === 'gu' ? 'સુરક્ષિત ઇમેઇલ OTP ચકાસણી' : 'Secure Email OTP Verification'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetForgotState}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{language === 'gu' ? 'પાછા જાવ' : 'Back'}</span>
                </button>
              </div>

              {/* STEP 1: ENTER REGISTERED EMAIL */}
              {forgotStep === 'phone' && (
                <form className="space-y-4" onSubmit={handleRequestOTP}>
                  <Input
                    label={language === 'gu' ? 'રજીસ્ટર્ડ ઇમેઇલ એડ્રેસ' : 'Registered Email Address'}
                    type="email"
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="e.g. jiya.vinchhi2412@gmail.com or admin@bandhej.com"
                    leftIcon={<Mail className="w-4 h-4" />}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full mt-2"
                    isLoading={isForgotLoading}
                  >
                    {language === 'gu' ? 'ઇમેઇલ પર OTP મોકલો' : 'Send Code to Email'}
                  </Button>

                  {/* Setup Gmail App Password Link */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setShowSmtpModal(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A20D38] hover:text-[#880D32] hover:underline transition-colors cursor-pointer"
                    >
                      <SettingsIcon className="w-3.5 h-3.5" />
                      <span>
                        {language === 'gu'
                          ? 'Gmail App Password સેટ કરો (અસલી ઇમેઇલ માટે)'
                          : '⚙️ Setup Gmail App Password (For Real Emails)'}
                      </span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: VERIFY 6-DIGIT OTP */}
              {forgotStep === 'otp' && (
                <form className="space-y-4" onSubmit={handleVerifyOTP}>
                  <div className="p-3 rounded-2xl bg-[#FCEDEC]/50 border border-[#F0E1E1] text-xs text-[#30232A] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#786773]">
                        {language === 'gu' ? 'મોકલેલ ઇમેઇલ:' : 'Sent to Email:'}
                      </span>
                      <span className="font-bold text-[#A20D38]">{maskedRecipient}</span>
                    </div>
                    <p className="text-[11px] text-[#786773]">
                      {language === 'gu'
                        ? 'આ કોડ ૫ મિનિટ માટે માન્ય છે. સુરક્ષા કારણોસર આ કોડ કોઈની સાથે શેર કરશો નહીં.'
                        : 'This code is valid for 5 minutes. Never share this code with anyone.'}
                    </p>
                  </div>

                  <Input
                    label={language === 'gu' ? '૬ અંકનો OTP દાખલ કરો' : 'Enter 6-Digit OTP Code'}
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 481923"
                    leftIcon={<ShieldCheck className="w-4 h-4" />}
                    className="tracking-widest text-center text-lg font-mono font-bold"
                  />

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[#786773]">
                      {cooldownSeconds > 0 ? (
                        <span>
                          {language === 'gu'
                            ? `ફરીથી મોકલો (${cooldownSeconds} સેકન્ડ)`
                            : `Resend in ${cooldownSeconds}s`}
                        </span>
                      ) : (
                        language === 'gu' ? 'કોડ નથી મળ્યો?' : "Didn't receive code?"
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={cooldownSeconds > 0 || isForgotLoading}
                      onClick={() => handleRequestOTP()}
                      className={`font-semibold flex items-center gap-1 transition-colors ${
                        cooldownSeconds > 0 || isForgotLoading
                          ? 'text-slate-400 cursor-not-allowed'
                          : 'text-[#A20D38] hover:text-[#880D32] hover:underline cursor-pointer'
                      }`}
                    >
                      <RefreshCw className={`w-3 h-3 ${isForgotLoading ? 'animate-spin' : ''}`} />
                      <span>{language === 'gu' ? 'કોડ ફરી મોકલો' : 'Resend Code'}</span>
                    </button>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full mt-2"
                    isLoading={isForgotLoading}
                  >
                    {language === 'gu' ? 'ચકાસણી કરો' : 'Verify & Continue'}
                  </Button>

                  {/* Didn't receive live email helper */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setShowSmtpModal(true)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#786773] hover:text-[#A20D38] hover:underline transition-colors cursor-pointer"
                    >
                      <SettingsIcon className="w-3 h-3 text-[#A20D38]" />
                      <span>
                        {language === 'gu'
                          ? 'ઇનબૉક્સમાં ઇમેઇલ નથી આવ્યો? Gmail App Password ઉમેરો'
                          : "Didn't receive email in inbox? Add Gmail App Password"}
                      </span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: CREATE NEW PASSWORD */}
              {forgotStep === 'new_password' && (
                <form className="space-y-3.5" onSubmit={handleResetPassword}>
                  <p className="text-xs text-[#786773] leading-relaxed">
                    {language === 'gu'
                      ? 'ઓળખ ચકાસાયેલ છે. કૃપા કરીને તમારો નવો સુરક્ષિત પાસવર્ડ દાખલ કરો.'
                      : 'Identity verified. Please create your new secure password (min 6 characters).'}
                  </p>

                  {/* New Password */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">
                      {language === 'gu' ? 'નવો પાસવર્ડ' : 'New Password'}
                    </label>
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={language === 'gu' ? 'ઓછામાં ઓછા ૬ અક્ષર' : 'At least 6 characters'}
                      leftIcon={<Lock className="w-4 h-4" />}
                      rightIcon={
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer transition-colors"
                          title={showNewPassword ? 'Hide password' : 'Show password'}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">
                      {language === 'gu' ? 'નવો પાસવર્ડ ફરીથી લખો' : 'Confirm New Password'}
                    </label>
                    <Input
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder={language === 'gu' ? 'પાસવર્ડ ફરીથી દાખલ કરો' : 'Re-enter new password'}
                      leftIcon={<Lock className="w-4 h-4" />}
                      rightIcon={
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer transition-colors"
                          title={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                  </div>

                  {/* Session Invalidation Warning */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px] flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#A20D38] shrink-0 mt-0.5" />
                    <span className="leading-tight">
                      {language === 'gu'
                        ? 'સુરક્ષા નોંધ: પાસવર્ડ બદલાતાં જ અગાઉનાં તમામ લૉગિન સત્રો આપોઆપ રદ થશે.'
                        : 'Security Note: All active login sessions across devices will be immediately invalidated.'}
                    </span>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full mt-2"
                    isLoading={isForgotLoading}
                  >
                    {language === 'gu' ? 'પાસવર્ડ બદલો' : 'Set New Password'}
                  </Button>
                </form>
              )}

              {/* STEP 4: SUCCESS CONFIRMATION */}
              {forgotStep === 'success' && (
                <div className="space-y-4 text-center py-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-base text-slate-900">
                      {language === 'gu' ? 'પાસવર્ડ સફળતાપૂર્વક બદલાઈ ગયો!' : 'Password Reset Successfully!'}
                    </h4>
                    <p className="text-xs text-[#786773] leading-relaxed max-w-xs mx-auto">
                      {language === 'gu'
                        ? 'તમારો પાસવર્ડ બદલાઈ ગયો છે અને સુરક્ષા માટે અગાઉના સત્રો રદ થયા છે. હવે તમારા નવા પાસવર્ડ સાથે લૉગિન કરો.'
                        : 'Your password has been updated and all prior sessions have been revoked. You can now sign in with your new password.'}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    className="w-full mt-3"
                    onClick={resetForgotState}
                  >
                    {language === 'gu' ? 'નવા પાસવર્ડથી લૉગિન કરો' : 'Sign In With New Password'}
                  </Button>
                </div>
              )}

              {/* Back to Sign In Link */}
              {forgotStep !== 'success' && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={resetForgotState}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    {language === 'gu' ? 'લૉગિન પર પાછા જાવ' : 'Back to Sign In'}
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[#786773] font-medium tracking-wide select-none">
          © 2026 BandhSetu | All Rights Reserved | Made with <span className="text-[#A20D38]">❤️</span> by Jiya Vinchhi
        </p>
      </div>

      {/* Gmail SMTP Configuration Modal */}
      <SMTPConfigModal
        isOpen={showSmtpModal}
        onClose={() => setShowSmtpModal(false)}
        onSaved={(cfg) => {
          setSuccessMessage(
            language === 'gu'
              ? `Gmail SMTP સફળતાપૂર્વક કનેક્ટ થયું (${cfg.masked_user})! હવે અસલી ઇમેઇલ આવશે.`
              : `Gmail SMTP connected successfully (${cfg.masked_user})! Real OTP emails are now enabled.`
          );
        }}
      />
    </div>
  );
};
