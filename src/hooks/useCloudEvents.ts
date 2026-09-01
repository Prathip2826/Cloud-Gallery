import { useState, useEffect, useCallback } from 'react';
import { CloudEvent, CloudStats } from '../types';
import { cloudService } from '../services/cloud';

export function useCloudEvents() {
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [stats, setStats] = useState<CloudStats | null>(null);
  const [architecture, setArchitecture] = useState<any>(null);
  const [isLiveActive, setIsLiveActive] = useState(true);

  const fetchCloudData = useCallback(async () => {
    try {
      const [eventsRes, statsRes, archRes] = await Promise.all([
        cloudService.getEvents(),
        cloudService.getStats(),
        cloudService.getArchitecture(),
      ]);
      setEvents(eventsRes.events);
      setStats(statsRes);
      setArchitecture(archRes.architecture);
    } catch (err) {
      console.warn('Failed to fetch cloud telemetry:', err);
    }
  }, []);

  useEffect(() => {
    fetchCloudData();
    if (!isLiveActive) return;

    // Poll every 3 seconds for active telemetry
    const interval = setInterval(fetchCloudData, 3000);
    return () => clearInterval(interval);
  }, [fetchCloudData, isLiveActive]);

  return {
    events,
    stats,
    architecture,
    isLiveActive,
    setIsLiveActive,
    refresh: fetchCloudData,
  };
}
