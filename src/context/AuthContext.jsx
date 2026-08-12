import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemInitialized, setSystemInitialized] = useState(true);

  const checkStatus = async () => {
    try {
      const res = await apiFetch('/auth/status');
      setSystemInitialized(res.initialized);
      
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const me = await apiFetch('/auth/me');
          setUser(me.user);
        } catch (e) {
          localStorage.removeItem('token');
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Failed to check auth status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const login = async (username, password) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    localStorage.setItem('token', res.token);
    setUser(res.user);
    setSystemInitialized(true);
    return res;
  };

  const register = async (username, password, name, role) => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, name, role })
    });
    localStorage.setItem('token', res.token);
    setUser(res.user);
    setSystemInitialized(true);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        systemInitialized,
        login,
        register,
        logout,
        refreshUser: checkStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
