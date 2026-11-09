import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, UserProfile, LoginResponse } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  role: 'admin' | 'manager' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLockedOut: boolean;
  lockMessage: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearLockout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('bandhej_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);

  const role = user?.role || (localStorage.getItem('bandhej_user_role') as 'admin' | 'manager' | null);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('bandhej_auth_token');
    localStorage.removeItem('bandhej_user_role');
    setToken(null);
    setUser(null);
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

  // Client-side heartbeat to proactively check Manager hours against IST
  useEffect(() => {
    if (!user || user.role !== 'manager' || !token) return;

    const checkInterval = setInterval(() => {
      // Calculate current IST hours and minutes
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
          return; // Still in temporary extension window
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
    }, 15000); // Check every 15s

    return () => clearInterval(checkInterval);
  }, [user, token, triggerLockout]);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const res: LoginResponse = await api.login(identifier, password);
      localStorage.setItem('bandhej_auth_token', res.access_token);
      localStorage.setItem('bandhej_user_role', res.role);
      setToken(res.access_token);
      setIsLockedOut(false);
      setLockMessage(null);

      // Populate user profile
      await refreshUser();
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

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated: Boolean(token && user),
        isLoading,
        isLockedOut,
        lockMessage,
        login,
        logout,
        refreshUser,
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

