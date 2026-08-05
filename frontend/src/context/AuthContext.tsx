import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthState } from '../types';
import { api } from '../services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  onboard: (data: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    business: null,
    token: localStorage.getItem('pharmaflow_token'),
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('pharmaflow_token');
      if (!token) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }
      try {
        const res = await api.get('/auth/me');
        setState({
          user: res.data.user,
          business: res.data.business,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (err) {
        localStorage.removeItem('pharmaflow_token');
        setState({
          user: null,
          business: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, user, business } = res.data;
    localStorage.setItem('pharmaflow_token', access_token);
    setState({
      user,
      business,
      token: access_token,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const onboard = async (data: any) => {
    const res = await api.post('/auth/onboard', data);
    const { access_token, user, business } = res.data;
    localStorage.setItem('pharmaflow_token', access_token);
    setState({
      user,
      business,
      token: access_token,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const logout = () => {
    localStorage.removeItem('pharmaflow_token');
    setState({
      user: null,
      business: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, onboard, logout }}>
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
