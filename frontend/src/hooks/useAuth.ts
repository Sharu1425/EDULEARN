import { useState, useEffect } from 'react';
import { User } from '../types';
import api from '../utils/api';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    const parsedUser = savedUser ? JSON.parse(savedUser) : null;
    // Ensure role is set with default value
    if (parsedUser && !parsedUser.role) {
      parsedUser.role = "student";
    }
    return parsedUser;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('access_token');

        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await api.get('/auth/status');

        if (response.data.isAuthenticated && response.data.user) {
          setUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        } else {
          setUser(null);
          localStorage.removeItem('user');
          localStorage.removeItem('access_token');
        }
      } catch (error) {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = (userData: User | null, token?: string) => {
    if (userData === null) {
      // Handle logout case
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      return;
    }

    // Ensure role is set with default value
    const userWithRole = {
      ...userData,
      role: userData.role || "student"
    };
    setUser(userWithRole);
    localStorage.setItem('user', JSON.stringify(userWithRole));
    if (token) {
      localStorage.setItem('access_token', token);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.clear(); // Ensure nothing is left behind
    window.location.href = '/login';
  };

  return {
    user,
    setUser: login,
    logout,
    isLoading
  };
};
