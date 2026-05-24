import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((response) => setUser(response.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password, totpCode) => {
    try {
      const response = await api.post('/auth/login', { email, password, totpCode });
      const { token, user: loggedInUser } = response.data;
      if (token) localStorage.setItem('token', token);
      setUser(loggedInUser);
      return { user: loggedInUser, token };
    } catch (error) {
      if (error.response?.data?.mfaRequired) {
        const err = new Error(error.response.data.message || 'MFA required');
        err.mfaRequired = true;
        err.mfaSecret = error.response.data.mfaSecret;
        err.enroll = error.response.data.enroll;
        throw err;
      }
      throw error;
    }
  };

  const register = async (email, password, name) => {
    const response = await api.post('/auth/register', { email, password, name });
    const { token, user: newUser } = response.data;
    if (token) localStorage.setItem('token', token);
    setUser(newUser);
    return { user: newUser, token };
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
