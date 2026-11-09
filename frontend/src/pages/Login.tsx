import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  ShieldCheck,
  UserCheck,
  Phone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from '../components/ui';
import { APP_NAME, APP_TAGLINE } from '../utils/constants';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLockedOut, lockMessage } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Please enter both your email/phone and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login(identifier.trim(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err.code === 'ACCESS_HOURS_EXPIRED' || err.code === 'ACCOUNT_LOCKED') {
        navigate('/access-locked', { replace: true });
      } else {
        setErrorMessage(err.message || 'Login failed. Please verify credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-craft-surface via-slate-50 to-brand-50/20">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Branding */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/30 mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {APP_NAME}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
            {APP_TAGLINE}
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-[11px] font-semibold text-slate-700">
            <Clock className="w-3.5 h-3.5 text-brand-600" />
            <span>Manager Hours: 09:00 AM – 08:00 PM IST</span>
          </div>
        </div>

        {/* Login Form Card */}
        <Card className="mt-6 shadow-xl border-slate-200">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
              </div>
            )}

            <Input
              label="Email Address or Mobile Number"
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. admin@bandhej.com or +919876543210"
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your secure password"
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 focus:outline-none"
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
              Sign In to Workshop
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              Quick Role Test Logins
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('admin@bandhej.com', 'Admin@123')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 transition-all text-left group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 group-hover:text-brand-700">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  <span>Admin / Owner</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5">24/7 Full Access</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('manager@bandhej.com', 'Manager@123')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all text-left group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 group-hover:text-amber-700">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  <span>Manager</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5">09:00 AM - 08:00 PM</span>
              </button>
            </div>
          </div>
        </Card>

        {/* Informative notice */}
        <p className="mt-6 text-center text-xs text-slate-400 leading-relaxed px-4">
          Protected workshop management system. Only authorized administrators and operators may log in. Women artisans do not log into this interface.
        </p>
      </div>
    </div>
  );
};

