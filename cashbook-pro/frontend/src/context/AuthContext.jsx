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

  // Auto-refresh token 1 minute before expiry
  useEffect(() => {
    let refreshTimer;

    if (isAuthenticated && window.__accessToken) {
      try {
        const payload = JSON.parse(atob(window.__accessToken.split('.')[1]));
        const expiryTime = payload.exp * 1000;
        const now = Date.now();
        const timeUntilExpiry = expiryTime - now;
        
        // Refresh 1 minute before expiry
        const refreshTime = Math.max(60000, timeUntilExpiry - 60000);

        refreshTimer = setTimeout(async () => {
          try {
            const response = await api.post('/auth/refresh');
            window.__accessToken = response.data.accessToken;
            
            // Set next refresh timer
            const newPayload = JSON.parse(atob(window.__accessToken.split('.')[1]));
            const newExpiryTime = newPayload.exp * 1000;
            const nextRefreshTime = Math.max(60000, newExpiryTime - Date.now() - 60000);
            
            refreshTimer = setTimeout(() => {
              // Token expired, redirect to login
              logout();
            }, nextRefreshTime);
          } catch (error) {
            logout();
          }
        }, refreshTime);
      } catch (error) {
        console.error('Error setting up token refresh:', error);
      }
    }

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [isAuthenticated]);

  const login = async (shopId, username, password) => {
    try {
      setIsLoading(true);
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
        error: error.response?.data?.error || 'Login failed',
        code: error.response?.data?.code,
        email: error.response?.data?.email,
      };
    } finally {
      setIsLoading(false);
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