import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

// Centralized Firebase Configuration
// Environment variables can be provided via .env (VITE_FIREBASE_*)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyA_DEMO_CLOUDGALLERY_KEY_2026',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'cloudgallery-hybrid-auth.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'cloudgallery-hybrid-auth',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'cloudgallery-hybrid-auth.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '102938475612',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:102938475612:web:a1b2c3d4e5f6g7h8i9j0k1',
};

// Initialize Firebase App safely (singleton)
export const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  type FirebaseUser,
};
