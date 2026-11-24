import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, UserProfile, LoginResponse, CompanyRegisterPayload } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  role: 'admin' | 'manager' | null;
  companyName: string;
  companyCode: string;
  businessId: number;
  isPrimaryAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLockedOut: boolean;
  lockMessage: string | null;
  login: (identifier: string, password: string, companyName?: string) => Promise<LoginResponse>;
  registerCompany: (payload: CompanyRegisterPayload) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserSession: (updatedUser: UserProfile, newToken?: string | null) => void;
  clearLockout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('bandhej_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState<string>(
    () => localStorage.getItem('bandhej_company_name') || 'Vinchhi Bandhej'
  );
  const [companyCode, setCompanyCode] = useState<string>(
    () => localStorage.getItem('bandhej_company_code') || 'COMP-0001'
  );
  const [businessId, setBusinessId] = useState<number>(
    () => Number(localStorage.getItem('bandhej_business_id')) || 1
  );
  const [isPrimaryAdmin, setIsPrimaryAdmin] = useState<boolean>(
    () => localStorage.getItem('bandhej_is_primary_admin') === 'true'
  );

  const role = user?.role || (localStorage.getItem('bandhej_user_role') as 'admin' | 'manager' | null);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('bandhej_auth_token');
    localStorage.removeItem('bandhej_user_role');
    localStorage.removeItem('bandhej_company_name');
    localStorage.removeItem('bandhej_company_code');
    localStorage.removeItem('bandhej_business_id');
    localStorage.removeItem('bandhej_is_primary_admin');
    setToken(null);
    setUser(null);
    setCompanyName('Vinchhi Bandhej');
    setCompanyCode('COMP-0001');
    setBusinessId(1);
    setIsPrimaryAdmin(false);
  }, []);

  const triggerLockout = useCallback((message: string) => {
    setIsLockedOut(true);
    setLockMessage(message);
    clearAuth();
  }, [clearAuth]);

  const refreshUser = useCallback(async () => {
    const activeToken = localStorage.getItem('bandhej_auth_token');
    if (!activeToken) {
      setIsLoading(false);
      return;
    }

    try {
      const profile = await api.getMe();
      setUser(profile);
      if (profile.business_id) {
        setBusinessId(profile.business_id);
        localStorage.setItem('bandhej_business_id', String(profile.business_id));
      }
      if (profile.is_primary_admin !== undefined) {
        setIsPrimaryAdmin(Boolean(profile.is_primary_admin));
        localStorage.setItem('bandhej_is_primary_admin', String(profile.is_primary_admin));
      }
      setIsLockedOut(false);
      setLockMessage(null);
    } catch (err: any) {
      if (err.code === 'ACCESS_HOURS_EXPIRED' || err.code === 'ACCOUNT_LOCKED') {
        triggerLockout(err.message || 'Access hours have ended or account locked by Owner.');
      } else {
        clearAuth();
      }
    } finally {
      setIsLoading(false);
    }
  }, [clearAuth, triggerLockout]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Synchronize authentication across multiple browser tabs and handle 401 unauthorized
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'bandhej_auth_token' || e.key === 'bandhej_user_role') {
        const activeToken = localStorage.getItem('bandhej_auth_token');
        setToken(activeToken);
        if (activeToken) {
          refreshUser();
        } else {
          clearAuth();
        }
      }
    };

    const handleUnauthorized = (e: any) => {
      clearAuth();
      const msg = e.detail || 'Session has expired or was revoked. Please log in again.';
      triggerLockout(msg);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('bandhej:unauthorized', handleUnauthorized as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('bandhej:unauthorized', handleUnauthorized as EventListener);
    };
  }, [clearAuth, refreshUser, triggerLockout]);

  // Client-side heartbeat to proactively check Manager hours against IST
  useEffect(() => {
    if (!user || user.role !== 'manager' || !token) return;

    const checkInterval = setInterval(() => {
      const now = new Date();
      const istString = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
      const [currH, currM] = istString.split(':').map(Number);
      const currMinutes = currH * 60 + currM;

      // Check temporary extension
      if (user.temporary_extension_until) {
        const extTime = new Date(user.temporary_extension_until).getTime();
        if (now.getTime() <= extTime) {
          return;
        }
      }

      // Check configured operating hours
      const [startH, startM] = (user.access_start_time || '09:00').split(':').map(Number);
      const [endH, endM] = (user.access_end_time || '20:00').split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      const isAllowed =
        startMinutes <= endMinutes
          ? currMinutes >= startMinutes && currMinutes <= endMinutes
          : currMinutes >= startMinutes || currMinutes <= endMinutes;

      if (!isAllowed) {
        triggerLockout(
          `Manager scheduled operating hours (${user.access_start_time} - ${user.access_end_time} IST) have ended. Access is closed until tomorrow 09:00 AM IST.`
        );
      }
    }, 15000);

    return () => clearInterval(checkInterval);
  }, [user, token, triggerLockout]);

  const login = async (identifier: string, password: string, compName?: string) => {
    setIsLoading(true);
    try {
      const res: LoginResponse = await api.login(identifier, password, compName);
      localStorage.setItem('bandhej_auth_token', res.access_token);
      localStorage.setItem('bandhej_user_role', res.role);
      if (res.company_name) {
        localStorage.setItem('bandhej_company_name', res.company_name);
        setCompanyName(res.company_name);
      }
      if (res.company_code) {
        localStorage.setItem('bandhej_company_code', res.company_code);
        setCompanyCode(res.company_code);
      }
      if (res.business_id) {
        localStorage.setItem('bandhej_business_id', String(res.business_id));
        setBusinessId(res.business_id);
      }
      if (res.is_primary_admin !== undefined) {
        localStorage.setItem('bandhej_is_primary_admin', String(res.is_primary_admin));
        setIsPrimaryAdmin(Boolean(res.is_primary_admin));
      }

      setToken(res.access_token);
      setIsLockedOut(false);
      setLockMessage(null);

      // Populate user profile
      await refreshUser();
      return res;
    } catch (err: any) {
      if (err.code === 'ACCESS_HOURS_EXPIRED' || err.code === 'ACCOUNT_LOCKED') {
        setIsLockedOut(true);
        setLockMessage(err.message || 'Access blocked by schedule or manual lock.');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const registerCompany = async (payload: CompanyRegisterPayload) => {
    setIsLoading(true);
    try {
      const res: LoginResponse = await api.registerCompany(payload);
      localStorage.setItem('bandhej_auth_token', res.access_token);
      localStorage.setItem('bandhej_user_role', res.role);
      if (res.company_name) {
        localStorage.setItem('bandhej_company_name', res.company_name);
        setCompanyName(res.company_name);
      }
      if (res.company_code) {
        localStorage.setItem('bandhej_company_code', res.company_code);
        setCompanyCode(res.company_code);
      }
      if (res.business_id) {
        localStorage.setItem('bandhej_business_id', String(res.business_id));
        setBusinessId(res.business_id);
      }
      if (res.is_primary_admin !== undefined) {
        localStorage.setItem('bandhej_is_primary_admin', String(res.is_primary_admin));
        setIsPrimaryAdmin(Boolean(res.is_primary_admin));
      }

      setToken(res.access_token);
      setIsLockedOut(false);
      setLockMessage(null);

      await refreshUser();
      return res;
    } catch (err: any) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      clearAuth();
      setIsLockedOut(false);
      setLockMessage(null);
    }
  };

  const clearLockout = () => {
    setIsLockedOut(false);
    setLockMessage(null);
  };

  const updateUserSession = useCallback((updatedUser: UserProfile, newToken?: string | null) => {
    setUser(updatedUser);
    if (newToken) {
      localStorage.setItem('bandhej_auth_token', newToken);
      setToken(newToken);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        companyName,
        companyCode,
        businessId,
        isPrimaryAdmin,
        isAuthenticated: Boolean(token && user),
        isLoading,
        isLockedOut,
        lockMessage,
        login,
        registerCompany,
        logout,
        refreshUser,
        updateUserSession,
        clearLockout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
