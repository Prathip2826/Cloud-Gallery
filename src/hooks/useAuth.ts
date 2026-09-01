import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authService } from '../services/auth';
import { FirebaseUser, isFirebaseConfigValid, checkFirebaseConfig, FirebaseConfigStatus } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<FirebaseConfigStatus>(() => checkFirebaseConfig());

  useEffect(() => {
    setConfigStatus(checkFirebaseConfig());
    // Monitor auth state via onAuthStateChanged
    try {
      const unsubscribe = authService.onAuthStateChange(
        (mappedUser, fbUser) => {
          setUser(mappedUser);
          setFirebaseUser(fbUser);
          setIsLoading(false);
        },
        (err) => {
          if (import.meta.env.DEV) {
            console.warn('[useAuth] Auth state error callback:', err);
          }
          setIsLoading(false);
        }
      );

      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[useAuth] Auth observer initialization error:', err);
      }
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<User> => {
    if (isSigningIn) {
      throw new Error('Sign-in already in progress.');
    }

    setIsSigningIn(true);
    setError(null);

    try {
      const authenticatedUser = await authService.loginWithGoogle();
      setUser(authenticatedUser);
      return authenticatedUser;
    } catch (err: any) {
      const message = err?.message || 'Unable to sign in. Please try again.';
      setError(message);
      throw new Error(message);
    } finally {
      setIsSigningIn(false);
    }
  }, [isSigningIn]);

  const logout = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await authService.logout();
      setUser(null);
      setFirebaseUser(null);
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('[useAuth] Logout error:', err);
      }
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    firebaseUser,
    isAuthenticated: !!user,
    isLoading,
    isSigningIn,
    error,
    clearError,
    loginWithGoogle,
    logout,
    isConfigured: isFirebaseConfigValid,
    configStatus,
  };
}

