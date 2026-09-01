import { apiRequest } from './api';
import { CloudEvent, CloudStats } from '../types';

export const cloudService = {
  async getEvents(): Promise<{ events: CloudEvent[] }> {
    return apiRequest<{ events: CloudEvent[] }>('/api/cloud/events');
  },

  async getStats(): Promise<CloudStats> {
    return apiRequest<CloudStats>('/api/cloud/stats');
  },

  async getArchitecture(): Promise<{ architecture: any }> {
    return apiRequest<{ architecture: any }>('/api/cloud/architecture');
  },
};
