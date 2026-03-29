import { useState, useEffect, useCallback } from 'react';
import webext from 'webextension-polyfill';

export const useChromeStorage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getQueues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await webext.storage.local.get(['queues']);
      return result.queues || [];
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const saveQueues = useCallback(async (queues) => {
    setLoading(true);
    setError(null);
    try {
      await webext.storage.local.set({ queues });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use chrome.storage.sync for settings like old extension
      const result = await webext.storage.sync.get(['settings']);
      return result.settings || {
        pollInterval: 5,
        disableAlarm: false,
        disablePolling: false,
        alertCondition: 'nonZeroCount',
        volume: 70,
        playbackDuration: 5,
        loopAudio: false
      };
    } catch (err) {
      setError(err.message);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async (settings) => {
    setLoading(true);
    setError(null);
    try {
      // Use chrome.storage.sync for settings like old extension
      await webext.storage.sync.set({ settings });
      console.log('💾 Settings saved to sync storage:', settings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getMonitoringStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await webext.storage.local.get(['isMonitoring']);
      return result.isMonitoring || false;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const setMonitoringStatus = useCallback(async (status) => {
    setLoading(true);
    setError(null);
    try {
      await webext.storage.local.set({ isMonitoring: status });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateQueueCount = useCallback(async (queueId, count) => {
    setLoading(true);
    setError(null);
    try {
      const queues = await getQueues();
      const updatedQueues = queues.map(queue => 
        queue.id === queueId ? { ...queue, currentCount: count } : queue
      );
      await saveQueues(updatedQueues);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getQueues, saveQueues]);

  return {
    getQueues,
    saveQueues,
    getSettings,
    saveSettings,
    getMonitoringStatus,
    setMonitoringStatus,
    updateQueueCount,
    loading,
    error
  };
};
