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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#FFF9F6] text-[#30232A]">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Pulsing Lock Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-[#FCEDEC] border border-[#F0E1E1] flex items-center justify-center text-[#A20D38] shadow-sm">
          <span className="absolute animate-ping inline-flex h-full w-full rounded-3xl bg-[#A20D38] opacity-20" />
          <ShieldAlert className="w-10 h-10 relative z-10" />
        </div>

        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#30232A]">
            Manager Access Restricted
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#786773] max-w-sm mx-auto leading-relaxed">
            {lockMessage || 'Operating hours for Manager accounts have ended or this account was locked manually by the business owner.'}
          </p>
        </div>

        {/* Live IST Clock Card */}
        <div className="p-5 rounded-3xl bg-white border border-[#F0E1E1] shadow-2xs flex items-center justify-center gap-3">
          <Clock className="w-5 h-5 text-[#A20D38]" />
          <div className="text-left">
            <p className="text-[10px] text-[#786773] uppercase tracking-wider font-semibold">
              Current Workshop Time (IST)
            </p>
            <p className="text-lg font-mono font-bold text-[#A20D38] tracking-wide">
              {currentIstTime || 'Loading time...'}
            </p>
          </div>
        </div>

        {/* Schedule & Owner info */}
        <div className="p-5 rounded-3xl bg-white border border-[#F0E1E1] text-xs text-[#786773] text-left space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span>Standard Operating Window:</span>
            <span className="font-semibold text-[#30232A]">09:00 AM – 08:00 PM IST</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Workshop Emergency Contact:</span>
            <span className="font-semibold text-[#A20D38] flex items-center gap-1 font-mono">
              <PhoneCall className="w-3.5 h-3.5" /> +91 94269 27175
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            size="lg"
            className="w-full rounded-full"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Access Again
          </Button>

          <Button
            variant="primary"
            size="lg"
            className="w-full rounded-full"
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

