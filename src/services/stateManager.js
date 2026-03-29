// State Management Service - Migrated from original state-manager.js

class StateManager {
  constructor() {
    this.defaultState = {
      queues: [],
      settings: {
        pollInterval: 5,
        disableAlarm: false,
        disablePolling: false,
        alertCondition: 'nonZeroCount',
        volume: 70,
        playbackDuration: 5,
        loopAudio: false,
        enableDesktop: true,
        enableSound: true,
        quietHours: false,
        quietStart: '22:00',
        quietEnd: '08:00',
        showTicketDetails: true
      },
      isMonitoring: false,
      previousCounts: {},
      lastPoll: null
    };
  }

  async initializeState() {
    try {
      const existing = await chrome.storage.local.get();
      const mergedState = { ...this.defaultState, ...existing };
      await chrome.storage.local.set(mergedState);
      console.log('📦 State initialized');
      return mergedState;
    } catch (error) {
      console.error('❌ Error initializing state:', error);
      return this.defaultState;
    }
  }

  async getState() {
    try {
      const result = await chrome.storage.local.get();
      return result;
    } catch (error) {
      console.error('❌ Error getting state:', error);
      return this.defaultState;
    }
  }

  async updateState(updates) {
    try {
      await chrome.storage.local.set(updates);
      console.log('📝 State updated:', updates);
    } catch (error) {
      console.error('❌ Error updating state:', error);
    }
  }

  async resetState() {
    try {
      await chrome.storage.local.clear();
      await this.initializeState();
      console.log('🔄 State reset to defaults');
    } catch (error) {
      console.error('❌ Error resetting state:', error);
    }
  }

  async getQueues() {
    try {
      const result = await chrome.storage.local.get(['queues']);
      return result.queues || [];
    } catch (error) {
      console.error('❌ Error getting queues:', error);
      return [];
    }
  }

  async saveQueues(queues) {
    try {
      await chrome.storage.local.set({ queues });
      console.log('💾 Queues saved:', queues.length);
    } catch (error) {
      console.error('❌ Error saving queues:', error);
    }
  }

  async getSettings() {
    try {
      const result = await chrome.storage.local.get(['settings']);
      return { ...this.defaultState.settings, ...result.settings };
    } catch (error) {
      console.error('❌ Error getting settings:', error);
      return this.defaultState.settings;
    }
  }

  async saveSettings(settings) {
    try {
      await chrome.storage.local.set({ settings });
      console.log('💾 Settings saved');
    } catch (error) {
      console.error('❌ Error saving settings:', error);
    }
  }

  async getMonitoringStatus() {
    try {
      const result = await chrome.storage.local.get(['isMonitoring']);
      return result.isMonitoring || false;
    } catch (error) {
      console.error('❌ Error getting monitoring status:', error);
      return false;
    }
  }

  async setMonitoringStatus(status) {
    try {
      await chrome.storage.local.set({ isMonitoring: status });
      console.log('📊 Monitoring status set to:', status);
    } catch (error) {
      console.error('❌ Error setting monitoring status:', error);
    }
  }

  async updateQueueCount(queueId, count) {
    try {
      const queues = await this.getQueues();
      const updatedQueues = queues.map(queue => 
        queue.id === queueId ? { ...queue, currentCount: count } : queue
      );
      await this.saveQueues(updatedQueues);
    } catch (error) {
      console.error('❌ Error updating queue count:', error);
    }
  }
}

// Export singleton instance
export const stateManager = new StateManager();

// Export individual functions for backward compatibility
export const getState = () => stateManager.getState();
export const updateState = (updates) => stateManager.updateState(updates);
export const resetState = () => stateManager.resetState();
export const initializeState = () => stateManager.initializeState();
export const getQueues = () => stateManager.getQueues();
export const saveQueues = (queues) => stateManager.saveQueues(queues);
export const getSettings = () => stateManager.getSettings();
export const saveSettings = (settings) => stateManager.saveSettings(settings);
export const getMonitoringStatus = () => stateManager.getMonitoringStatus();
export const setMonitoringStatus = (status) => stateManager.setMonitoringStatus(status);
export const updateQueueCount = (queueId, count) => stateManager.updateQueueCount(queueId, count);
