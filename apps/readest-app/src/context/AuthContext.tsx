'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';
import posthog from 'posthog-js';
import { useLibraryStore } from '@/store/libraryStore';
import { useBookDataStore } from '@/store/bookDataStore';

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAdmin: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  });
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const userJson = localStorage.getItem('user');
      return userJson ? JSON.parse(userJson) : null;
    }
    return null;
  });
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchAdminStatus = async (accessToken: string) => {
    try {
      const backendUrl = process.env['NEXT_PUBLIC_BACKEND_BASE_URL'] || '';
      const res = await fetch(`${backendUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.isAdmin === true);
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    }
  };

  const clearAuthScopedState = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsAdmin(false);
    useLibraryStore.setState({
      library: [],
      libraryLoaded: false,
      currentBookshelf: [],
      selectedBooks: new Set(),
      groups: {},
      isSyncing: false,
      syncProgress: 0,
    });
    useBookDataStore.setState({ booksData: {} });
  };

  useEffect(() => {
    const syncSession = (
      session: { access_token: string; refresh_token: string; user: User } | null,
    ) => {
      if (session) {
        console.log('Syncing session');
        const { access_token, refresh_token, user } = session;
        localStorage.setItem('token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('user', JSON.stringify(user));
        posthog.identify(user.id);
        setToken(access_token);
        setUser(user);
        fetchAdminStatus(access_token);
      } else {
        clearAuthScopedState();
      }
    };
    const refreshSession = async () => {
      try {
        await supabase.auth.refreshSession();
      } catch {
        syncSession(null);
      }
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((_, session) => {
      syncSession(session);
    });

    refreshSession();
    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, []);

  const login = (newToken: string, newUser: User) => {
    console.log('Logging in');
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = async () => {
    console.log('Logging out');
    clearAuthScopedState();
    try {
      await supabase.auth.refreshSession();
    } catch {
    } finally {
      await supabase.auth.signOut();
      clearAuthScopedState();
    }
  };

  const refresh = async () => {
    try {
      await supabase.auth.refreshSession();
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ token, user, isAdmin, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
