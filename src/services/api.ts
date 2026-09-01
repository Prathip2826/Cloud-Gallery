import { auth } from '../lib/firebase';

const TOKEN_KEY = 'cloudgallery_auth_token';

// Support deployed AWS API Gateway Base URL if provided in environment variables
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_AWS_API_GATEWAY_URL || '').replace(/\/$/, '');

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    console.error('Failed to access localStorage:', e);
  }
}

/**
 * Retrieves the active Firebase ID token (or stored fallback).
 */
export async function getFirebaseIdToken(): Promise<string | null> {
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        setStoredToken(token);
        return token;
      }
    }
  } catch (e) {
    console.warn('Failed to retrieve fresh Firebase ID token:', e);
  }
  return getStoredToken();
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getFirebaseIdToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const resolvedUrl = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(resolvedUrl, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.error) {
        errorMessage = errorJson.error;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}
