import { apiRequest, setStoredToken, getStoredToken } from './api';
import { User } from '../types';

export interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  async signup(email: string, password: string, name: string): Promise<AuthResponse> {
    const data = await apiRequest<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    setStoredToken(data.token);
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    return data;
  },

  async getMe(): Promise<{ user: User }> {
    const token = getStoredToken();
    if (!token) throw new Error('No token found');
    return apiRequest<{ user: User }>('/api/auth/me');
  },

  logout(): void {
    setStoredToken(null);
  },

  async forgotPassword(email: string): Promise<{ message: string; code?: string }> {
    return apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(email: string, newPassword: string): Promise<{ message: string }> {
    return apiRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, newPassword }),
    });
  },
};
