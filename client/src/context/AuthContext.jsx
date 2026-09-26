import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  fetchCurrentUser,
  loginUser,
  registerUser,
  updatePrivacySettings
} from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getAuthToken());
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize session from token
  useEffect(() => {
    async function initAuth() {
      const existingToken = getAuthToken();
      if (existingToken) {
        try {
          const profile = await fetchCurrentUser();
          if (profile) {
            setUser(profile);
          } else {
            // Token expired or invalid
            clearAuthToken();
            setToken(null);
          }
        } catch (e) {
          console.warn('[AuthContext] Session verification warning:', e.message);
        }
      }
      setIsAuthLoading(false);
    }
    initAuth();
  }, []);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      const res = await loginUser({ email, password });
      setUser(res.user);
      setToken(res.token);
      return res;
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    }
  };

  const register = async (userData) => {
    setAuthError(null);
    try {
      const res = await registerUser(userData);
      setUser(res.user);
      setToken(res.token);
      return res;
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
      throw err;
    }
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
    setToken(null);
    setAuthError(null);
  };

  const updatePrivacy = async (privacySettings) => {
    try {
      const updated = await updatePrivacySettings(privacySettings);
      setUser((prev) => (prev ? { ...prev, privacySettings: updated } : prev));
      return updated;
    } catch (err) {
      console.error('[AuthContext] Update privacy error:', err);
      throw err;
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isAuthLoading,
    authError,
    setAuthError,
    login,
    register,
    logout,
    updatePrivacy
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
