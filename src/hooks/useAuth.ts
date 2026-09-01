import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authService } from '../services/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { user } = await authService.getMe();
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.login(email, pass);
      setUser(res.user);
      return res.user;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, pass: string, name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.signup(email, pass, name);
      setUser(res.user);
      return res.user;
    } catch (err: any) {
      setError(err.message || 'Signup failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const loginAsDemo = async () => {
    return login('alex.cloud@example.com', 'CloudPass2026!');
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    signup,
    logout,
    loginAsDemo,
    checkAuth,
  };
}
