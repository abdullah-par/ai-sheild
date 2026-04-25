import React, { createContext, useState, useContext, useEffect } from 'react';
import * as api from './api';

const AuthContext = createContext(null);
const PROFILE_MAP_KEY = 'user_profiles';

const readProfiles = () => {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_MAP_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveProfile = (email, profile) => {
  if (!email || !profile) return;
  const map = readProfiles();
  map[email] = {
    username: profile.username || '',
    avatarKey: profile.avatarKey || '',
    avatarDataUrl: profile.avatarDataUrl || '',
  };
  localStorage.setItem(PROFILE_MAP_KEY, JSON.stringify(map));
};

const getProfile = (email) => {
  const map = readProfiles();
  return map[email] || {};
};

const withProfile = (userData) => {
  if (!userData?.email) return userData;
  const profile = getProfile(userData.email);
  return {
    ...userData,
    username: profile.username || userData.email.split('@')[0],
    avatarKey: profile.avatarKey || '',
    avatarDataUrl: profile.avatarDataUrl || '',
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Verify token by fetching current user
          const userData = await api.get('/auth/me');
          setUser(withProfile(userData));
        } catch (err) {
          console.error('Session expired or invalid');
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password, profileInput = null) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.access_token);
    if (profileInput) {
      saveProfile(email, profileInput);
    }
    const userData = await api.get('/auth/me');
    const mergedUser = withProfile(userData);
    setUser(mergedUser);
    return mergedUser;
  };

  const register = async (email, password, profileInput = null) => {
    await api.post('/auth/register', { email, password });
    return login(email, password, profileInput);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
