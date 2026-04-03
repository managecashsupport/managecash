import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check session on app load
  useEffect(() => {
    checkSession();
  }, []);

  // Auto-refresh token 1 minute before expiry — recursive chain
  useEffect(() => {
    let refreshTimer;
    let cancelled = false;

    const scheduleRefresh = (token) => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const msUntilExpiry = payload.exp * 1000 - Date.now();
        const delay = Math.max(30000, msUntilExpiry - 60000); // refresh 1 min before expiry, min 30s

        refreshTimer = setTimeout(async () => {
          if (cancelled) return;
          try {
            const response = await api.post('/auth/refresh');
            window.__accessToken = response.data.accessToken;
            scheduleRefresh(response.data.accessToken); // chain next refresh
          } catch {
            logout();
          }
        }, delay);
      } catch {
        // malformed token — do nothing, let the next API call handle 401
      }
    };

    if (isAuthenticated && window.__accessToken) {
      scheduleRefresh(window.__accessToken);
    }

    return () => {
      cancelled = true;
      clearTimeout(refreshTimer);
    };
  }, [isAuthenticated]);

  const login = async (shopId, username, password) => {
    try {
      const response = await api.post('/auth/login', {
        shopId,
        username,
        password
      });

      window.__accessToken = response.data.accessToken;
      setUser(response.data.user);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || (error.request ? 'Unable to reach server — check your internet connection.' : 'Login failed. Please try again.'),
        code: error.response?.data?.code,
        email: error.response?.data?.email,
      };
    }
  };

  const register = async (shopId, shopName, ownerName, ownerEmail, password, confirmPassword) => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/register', {
        shopId,
        shopName,
        ownerName,
        ownerEmail,
        password,
        confirmPassword
      });

      // Registration requires email verification — don't log in yet
      if (response.data.requiresVerification) {
        return {
          success: true,
          requiresVerification: true,
          email: response.data.email,
          shopId: response.data.shopId,
          username: response.data.username,
        };
      }

      window.__accessToken = response.data.accessToken;
      setUser(response.data.user);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      window.__accessToken = null;
      setUser(null);
      setIsAuthenticated(false);
      window.location.href = '/login';
    }
  };

  const checkSession = async () => {
    try {
      // Try to refresh token to check if session is still valid
      const response = await api.post('/auth/refresh');
      window.__accessToken = response.data.accessToken;
      
      // Get user info
      const userResponse = await api.get('/users/me');
      setUser(userResponse.data);
      setIsAuthenticated(true);
    } catch (error) {
      // Session expired or invalid
      window.__accessToken = null;
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    checkSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};