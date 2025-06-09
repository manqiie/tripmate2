// src/contexts/AuthContext.jsx - Fixed version to prevent redirect on refresh
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    console.log('🔐 Auth initialization - Token:', token ? 'Present' : 'None');
    
    if (token) {
      // Add token to axios headers immediately
      api.defaults.headers.common['Authorization'] = `Token ${token}`;
      fetchProfile();
    } else {
      console.log('🔐 No token found, setting loading to false');
      setLoading(false);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      console.log('👤 Fetching user profile...');
      const response = await api.get('/auth/profile/');
      console.log('✅ Profile fetched successfully:', response.data.username);
      setUser(response.data);
    } catch (error) {
      console.error('❌ Error fetching profile:', error.response?.status, error.response?.data);
      
      // If token is invalid, clear it
      if (error.response?.status === 401) {
        console.log('🚫 Token invalid, clearing authentication');
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      console.log('🔑 Attempting login for:', username);
      const response = await api.post('/auth/login/', { username, password });
      const { token, user } = response.data;
      
      console.log('✅ Login successful for:', user.username);
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Token ${token}`;
      setToken(token);
      setUser(user);
      return { success: true };
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data);
      const errorMessage = error.response?.data?.username?.[0] || 
                          error.response?.data?.non_field_errors?.[0] ||
                          error.response?.data?.error || 
                          'Login failed. Please check your credentials.';
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const register = async (userData) => {
    try {
      console.log('📝 Attempting registration for:', userData.username);
      const response = await api.post('/auth/register/', userData);
      const { token, user } = response.data;
      
      console.log('✅ Registration successful for:', user.username);
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Token ${token}`;
      setToken(token);
      setUser(user);
      return { success: true };
    } catch (error) {
      console.error('❌ Registration failed:', error.response?.data);
      return { 
        success: false, 
        error: error.response?.data || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Attempting logout...');
      await api.post('/auth/logout/');
    } catch (error) {
      console.error('⚠️ Logout error:', error);
    } finally {
      console.log('🧹 Clearing authentication data');
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setToken(null);
      setUser(null);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      console.log('📝 Updating profile...');
      const response = await api.patch('/auth/profile/', profileData);
      console.log('✅ Profile updated successfully');
      setUser(response.data);
      return { success: true };
    } catch (error) {
      console.error('❌ Profile update failed:', error.response?.data);
      return { 
        success: false, 
        error: error.response?.data || 'Update failed' 
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
  };

  // Debug logging
  useEffect(() => {
    console.log('🔄 Auth state changed:', {
      loading,
      hasUser: !!user,
      hasToken: !!token,
      username: user?.username
    });
  }, [loading, user, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};