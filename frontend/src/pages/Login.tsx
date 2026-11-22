import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button, Input, Card } from '../components/ui';
import { APP_NAME, APP_TAGLINE } from '../utils/constants';
import { api } from '../services/api';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  // Mode: login vs register
  const [isRegistering, setIsRegistering] = useState(false);

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
      await login(identifier.trim(), password);
      navigate(from, { replace: true });
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
      setIsRegistering(false);

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

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-craft-surface via-slate-50 to-brand-50/20 relative">
      {/* Top Language Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button
          type="button"
          onClick={() => setLanguage(language === 'gu' ? 'en' : 'gu')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-brand-300 bg-white shadow-2xs text-xs font-semibold text-slate-700 hover:text-brand-700 transition-all active:scale-95 cursor-pointer"
          title="Change Language / ભાષા બદલો"
        >
          <Languages className="w-3.5 h-3.5 text-brand-600" />
          <span>{language === 'gu' ? 'ગુજરાતી' : 'English'}</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Main Card with Branding Inside */}
        <Card className="shadow-xl border-slate-200 p-6 sm:p-8">
          {/* Branding */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/30 mb-3">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {APP_NAME}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
              {language === 'gu' ? 'બાંધેજ કારીગર અને હિસાબ સંચાલન' : APP_TAGLINE}
            </p>
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

          {!isRegistering ? (
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
                <label className="block text-xs sm:text-sm font-medium text-slate-700">
                  {language === 'gu' ? 'પાસવર્ડ' : 'Password'}
                </label>
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
                    setIsRegistering(true);
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
          ) : (
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
                    setIsRegistering(false);
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
                    setIsRegistering(false);
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
        </Card>
      </div>
    </div>
  );
};
