import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Clock, ArrowRight, PhoneCall, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Card } from '../components/ui';

export const AccessLocked: React.FC = () => {
  const navigate = useNavigate();
  const { lockMessage, clearLockout, logout } = useAuth();
  const [currentIstTime, setCurrentIstTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const istStr = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(new Date());
      setCurrentIstTime(`${istStr} IST`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleReturnToLogin = async () => {
    await logout();
    clearLockout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 text-white">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Pulsing Lock Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-2xl">
          <span className="absolute animate-ping inline-flex h-full w-full rounded-3xl bg-rose-400 opacity-20" />
          <ShieldAlert className="w-10 h-10 relative z-10" />
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Manager Access Restricted
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            {lockMessage || 'Operating hours for Manager accounts have ended or this account was locked manually by the business owner.'}
          </p>
        </div>

        {/* Live IST Clock Card */}
        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center gap-3">
          <Clock className="w-5 h-5 text-amber-400" />
          <div className="text-left">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Current Workshop Time (IST)
            </p>
            <p className="text-lg font-mono font-bold text-white tracking-wide">
              {currentIstTime || 'Loading time...'}
            </p>
          </div>
        </div>

        {/* Schedule & Owner info */}
        <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-400 text-left space-y-2">
          <div className="flex items-center justify-between">
            <span>Standard Operating Window:</span>
            <span className="font-semibold text-slate-200">09:00 AM – 08:00 PM IST</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Workshop Emergency Contact:</span>
            <span className="font-semibold text-brand-400 flex items-center gap-1">
              <PhoneCall className="w-3.5 h-3.5" /> +91 98765 43210
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            size="lg"
            className="w-full bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Access Again
          </Button>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleReturnToLogin}
          >
            Switch Account
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};
