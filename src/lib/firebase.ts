import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

// Centralized Firebase Web App Configuration (Project: gallery-f0dec)
export const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBX5y71-yHYyXY_SCUQ0F0wjir7DCGfpOM').trim(),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'gallery-f0dec.firebaseapp.com').trim(),
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gallery-f0dec').trim(),
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'gallery-f0dec.firebasestorage.app').trim(),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '277460140133').trim(),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || '1:277460140133:web:244ef7a2e0c5a67098868c').trim(),
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-E6RD0RT734').trim(),
};

export interface FirebaseConfigStatus {
  isValid: boolean;
  missingVars: string[];
  loadedConfig: {
    hasApiKey: boolean;
    hasAuthDomain: boolean;
    hasProjectId: boolean;
    hasStorageBucket: boolean;
    hasMessagingSenderId: boolean;
    hasAppId: boolean;
  };
}

export function checkFirebaseConfig(): FirebaseConfigStatus {
  const missing: string[] = [];

  if (!firebaseConfig.apiKey) missing.push('VITE_FIREBASE_API_KEY');
  if (!firebaseConfig.authDomain) missing.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!firebaseConfig.projectId) missing.push('VITE_FIREBASE_PROJECT_ID');
  if (!firebaseConfig.storageBucket) missing.push('VITE_FIREBASE_STORAGE_BUCKET');
  if (!firebaseConfig.messagingSenderId) missing.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
  if (!firebaseConfig.appId) missing.push('VITE_FIREBASE_APP_ID');

  return {
    isValid: missing.length === 0,
    missingVars: missing,
    loadedConfig: {
      hasApiKey: !missing.includes('VITE_FIREBASE_API_KEY'),
      hasAuthDomain: !missing.includes('VITE_FIREBASE_AUTH_DOMAIN'),
      hasProjectId: !missing.includes('VITE_FIREBASE_PROJECT_ID'),
      hasStorageBucket: !missing.includes('VITE_FIREBASE_STORAGE_BUCKET'),
      hasMessagingSenderId: !missing.includes('VITE_FIREBASE_MESSAGING_SENDER_ID'),
      hasAppId: !missing.includes('VITE_FIREBASE_APP_ID'),
    },
  };
}

export const firebaseConfigStatus = checkFirebaseConfig();
export const isFirebaseConfigValid: boolean = firebaseConfigStatus.isValid;

// Initialize Firebase App instance safely (singleton)
let appInstance: FirebaseApp;
try {
  if (getApps().length === 0) {
    appInstance = initializeApp(firebaseConfig);
  } else {
    appInstance = getApp();
  }
} catch (error) {
  if (import.meta.env.DEV) {
    console.warn('[Firebase] Initialization error:', error);
  }
  appInstance = (getApps().length > 0 ? getApp() : null) as FirebaseApp;
}

export const app: FirebaseApp = appInstance;

// Initialize Firebase Auth
let authInstance: Auth | null = null;
if (appInstance) {
  try {
    authInstance = getAuth(appInstance);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[Firebase] Auth initialization note:', err);
    }
  }
}

export const getAuthInstance = (): Auth | null => {
  if (!authInstance && appInstance) {
    try {
      authInstance = getAuth(appInstance);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[Firebase] getAuth error:', err);
      }
    }
  }
  return authInstance;
};

// Google Auth Provider configured for popups
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Safe auth proxy export
export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const instance = getAuthInstance();
    if (instance) {
      const val = (instance as any)[prop];
      if (typeof val === 'function') {
        return val.bind(instance);
      }
      return val;
    }
    if (prop === 'currentUser') return null;
    if (prop === 'app') return appInstance;
    return undefined;
  },
});

export {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type FirebaseUser,
};

