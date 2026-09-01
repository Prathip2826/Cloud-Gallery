import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
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
   * Register a new user with Firebase Authentication.
   */
  async signup(email: string, password: string, name: string): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name.trim()) {
      await updateProfile(userCredential.user, { displayName: name.trim() });
    }
    const token = await userCredential.user.getIdToken();
    setStoredToken(token);
    return mapFirebaseUser(userCredential.user);
  },

  /**
   * Log in an existing user with Firebase Authentication.
   */
  async login(email: string, password: string): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const token = await userCredential.user.getIdToken();
    setStoredToken(token);
    return mapFirebaseUser(userCredential.user);
  },

  /**
   * Log out the current user from Firebase.
   */
  async logout(): Promise<void> {
    await signOut(auth);
    setStoredToken(null);
  },

  /**
   * Send a password reset email via Firebase Authentication.
   */
  async sendPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    await sendPasswordResetEmail(auth, email.trim());
    return {
      success: true,
      message: `Password reset instructions have been sent to ${email}.`,
    };
  },

  /**
   * Get fresh Firebase ID Token.
   */
  async getIdToken(forceRefresh = false): Promise<string | null> {
    if (!auth.currentUser) return null;
    const token = await auth.currentUser.getIdToken(forceRefresh);
    setStoredToken(token);
    return token;
  },

  /**
   * Subscribe to Firebase Auth state changes.
   */
  onAuthStateChange(callback: (user: User | null, firebaseUser: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setStoredToken(token);
        callback(mapFirebaseUser(firebaseUser), firebaseUser);
      } else {
        setStoredToken(null);
        callback(null, null);
      }
    });
  },
};
