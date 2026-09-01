import {
  auth,
  getAuthInstance,
  googleProvider,
  isFirebaseConfigValid,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  FirebaseUser,
} from '../lib/firebase';
import { setStoredToken } from './api';
import { User } from '../types';

export function mapFirebaseUser(user: FirebaseUser): User {
  return {
    id: user.uid,
    uid: user.uid,
    email: user.email || '',
    name: user.displayName || user.email?.split('@')[0] || 'Cloud User',
    avatarUrl: user.photoURL || undefined,
    createdAt: user.metadata.creationTime || new Date().toISOString(),
  };
}

export const authService = {
  /**
   * Check if Firebase configuration is present and valid.
   */
  isConfigured(): boolean {
    return isFirebaseConfigValid && Boolean(getAuthInstance());
  },

  /**
   * Primary authentication method: Sign in / Sign up with Google popup.
   * Handles both new and returning users seamlessly.
   */
  async loginWithGoogle(): Promise<User> {
    const authInst = getAuthInstance();
    if (!authInst || !isFirebaseConfigValid) {
      throw new Error('Authentication configuration is incomplete.');
    }

    try {
      const result = await signInWithPopup(authInst, googleProvider);
      const token = await result.user.getIdToken();
      setStoredToken(token);
      return mapFirebaseUser(result.user);
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.warn('[Firebase Auth] Google Sign-In caught error:', err);
      }

      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        throw new Error('Sign-in was cancelled.');
      }
      if (code === 'auth/popup-blocked') {
        throw new Error('Popups are blocked by your browser. Please allow popups for Google Sign-In.');
      }
      if (code === 'auth/network-request-failed') {
        throw new Error('Network connection error. Please check your internet connection and try again.');
      }
      if (
        code === 'auth/invalid-api-key' ||
        code === 'auth/api-key-not-valid' ||
        code === 'auth/configuration-not-found' ||
        code === 'auth/project-not-found'
      ) {
        throw new Error('Firebase configuration error. Please verify the project settings.');
      }
      if (code === 'auth/unauthorized-domain') {
        throw new Error('This domain is not authorized in Firebase Authentication settings. Please add your preview URL to Authorized Domains in Firebase Console.');
      }
      if (code === 'auth/operation-not-allowed') {
        throw new Error('Google sign-in provider is not enabled. Please enable Google provider in the Firebase Console under Authentication > Sign-in method.');
      }

      throw new Error(err?.message && !err.message.includes('Firebase:') ? err.message : 'Unable to sign in with Google. Please try again.');
    }
  },

  /**
   * Log out the current user from Firebase.
   */
  async logout(): Promise<void> {
    const authInst = getAuthInstance();
    if (authInst) {
      try {
        await signOut(authInst);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[Firebase Auth] Sign out error:', err);
        }
      }
    }
    setStoredToken(null);
  },

  /**
   * Get fresh Firebase ID Token.
   */
  async getIdToken(forceRefresh = false): Promise<string | null> {
    const authInst = getAuthInstance();
    if (!authInst || !authInst.currentUser) return null;
    try {
      const token = await authInst.currentUser.getIdToken(forceRefresh);
      setStoredToken(token);
      return token;
    } catch {
      return null;
    }
  },

  /**
   * Subscribe to Firebase Auth state changes with comprehensive error handling.
   */
  onAuthStateChange(
    callback: (user: User | null, firebaseUser: FirebaseUser | null) => void,
    onError?: (err: any) => void
  ) {
    const authInst = getAuthInstance();
    if (!authInst) {
      callback(null, null);
      return () => {};
    }

    try {
      return onAuthStateChanged(
        authInst,
        async (firebaseUser) => {
          if (firebaseUser) {
            try {
              const token = await firebaseUser.getIdToken();
              setStoredToken(token);
            } catch (tokenErr) {
              if (import.meta.env.DEV) {
                console.warn('Failed to retrieve Firebase ID token:', tokenErr);
              }
            }
            callback(mapFirebaseUser(firebaseUser), firebaseUser);
          } else {
            setStoredToken(null);
            callback(null, null);
          }
        },
        (error) => {
          if (import.meta.env.DEV) {
            console.warn('[Firebase Auth] Auth state listener observed note:', error);
          }
          if (onError) {
            onError(error);
          }
          callback(null, null);
        }
      );
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('Failed to register onAuthStateChanged:', err);
      }
      if (onError) {
        onError(err);
      }
      callback(null, null);
      return () => {};
    }
  },
};

