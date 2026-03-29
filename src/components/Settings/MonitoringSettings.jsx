import React, { useState, useEffect } from 'react';
import { playAudio } from '../../services/audioManager';
import { showNotification } from '../../services/notificationSystem';
import { useChromeStorage } from '../../hooks/useChromeStorage';

const MonitoringSettings = ({ settings, onSave }) => {
  const [monitoringSettings, setMonitoringSettings] = useState({
    pollInterval: 5,
    disableAlarm: false,
    disablePolling: false,
    alertCondition: 'nonZeroCount',
    enableSound: true // Added enableSound property
  });

  const { getSettings, saveSettings } = useChromeStorage();

  // Dynamic update function to refresh from storage
  const refreshFromStorage = async () => {
    console.log('🔄 Refreshing monitoring settings from storage...');
    const currentSettings = await getSettings();
    if (currentSettings) {
      console.log('📊 Current settings from storage:', currentSettings);
      setMonitoringSettings({
        pollInterval: currentSettings.pollInterval || 5,
        disableAlarm: currentSettings.disableAlarm || false,
        disablePolling: currentSettings.disablePolling || false,
        alertCondition: currentSettings.alertCondition || 'nonZeroCount'
      });
    }
  };

  useEffect(() => {
    // Initialize from storage
    refreshFromStorage();
    
    // Set up storage listener for dynamic updates
    const handleStorageChange = (changes, areaName) => {
      if (areaName === 'local' && changes.settings) {
        console.log('🔄 Settings changed in storage, updating UI...');
        refreshFromStorage();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    // Cleanup listener on unmount
    return () => {
      if (chrome.storage.onChanged.hasListener(handleStorageChange)) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
    };
  }, []);

  const handleSave = async () => {
    try {
      console.log('💾 Saving monitoring settings:', monitoringSettings);
      await saveSettings(monitoringSettings);
      console.log('✅ Monitoring settings saved successfully');
    } catch (error) {
      console.error('❌ Error saving monitoring settings:', error);
    }
  };

  const handleTestAudio = () => {
    console.log('🔊 Testing audio notification');
    // Fire and forget - like old extension
    chrome.runtime.sendMessage({
      type: 'PLAY_AUDIO',
      settings: {
        volume: 70,
        playbackDuration: 5,
        loopAudio: false
      }
    });
    console.log('✅ Audio test request sent');
  };

  const handleTestNotification = async () => {
    console.log('🔔 Testing desktop notification');
    try {
      const notificationId = await showNotification(
        'ServiceNow Audio Alerts - Test',
        'This is a test notification from your ServiceNow monitoring extension',
        'info'
      );
      if (notificationId) {
        console.log('✅ Notification test successful, ID:', notificationId);
      } else {
        console.error('❌ Notification test failed - check permissions');
      }
    } catch (error) {
      console.error('❌ Error testing notification:', error);
    }
  };

  return (
    <div className="monitoring-settings">
      <div className="settings-section">
        <h3>🔧 Monitoring Controls</h3>
        
        <div className="toggle-control">
          <div className="toggle-info">
            <label className="toggle-label">Disable Alarm Sound</label>
            <p className="toggle-description">Stops audio but continues tracking tickets</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={monitoringSettings.disableAlarm}
              onChange={(e) => setMonitoringSettings(prev => ({ ...prev, disableAlarm: e.target.checked }))}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="toggle-control">
          <div className="toggle-info">
            <label className="toggle-label">Disable Polling</label>
            <p className="toggle-description">Stops all monitoring activity</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={monitoringSettings.disablePolling}
              onChange={(e) => setMonitoringSettings(prev => ({ ...prev, disablePolling: e.target.checked }))}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>🚨 Alert Conditions</h3>
        
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="alertCondition"
              value="nonZeroCount"
              checked={monitoringSettings.alertCondition === 'nonZeroCount'}
              onChange={(e) => setMonitoringSettings(prev => ({ ...prev, alertCondition: e.target.value }))}
            />
            <span className="radio-custom"></span>
            Alert when count {'>'} 0
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="alertCondition"
              value="newTicket"
              checked={monitoringSettings.alertCondition === 'newTicket'}
              onChange={(e) => setMonitoringSettings(prev => ({ ...prev, alertCondition: e.target.value }))}
            />
            <span className="radio-custom"></span>
            Alert on new ticket
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>⏱️ Polling Settings</h3>
        
        <div className="form-group">
          <label className="form-label">Poll Interval (minutes)</label>
          <input
            type="number"
            className="form-control"
            placeholder="5"
            min="1"
            max="60"
            value={monitoringSettings.pollInterval}
            onChange={(e) => setMonitoringSettings(prev => ({ ...prev, pollInterval: parseInt(e.target.value) }))}
          />
          <div className="help-text">Default is 5 minutes. Changes apply immediately.</div>
        </div>

        <div className="form-group">
          <label className="form-label">Real-time Status</label>
          <div className="status-display">
            <div className={`status-indicator ${monitoringSettings.disablePolling ? 'stopped' : 'active'}`}>
              {monitoringSettings.disablePolling ? '⏸️ Stopped' : '⏵️ Active'}
            </div>
            <div className="status-text">
              {monitoringSettings.disablePolling ? 'Polling is disabled' : `Polling every ${monitoringSettings.pollInterval} minutes`}
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>🧪 Testing</h3>
        
        <div className="test-controls">
          <button className="btn btn-secondary" onClick={handleTestAudio}>
            🔊 Test Audio
          </button>
          <button className="btn btn-secondary" onClick={handleTestNotification}>
            🔔 Test Notification
          </button>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn-primary" onClick={handleSave}>
          💾 Save Settings
        </button>
        <button className="btn btn-secondary" onClick={refreshFromStorage}>
          🔄 Refresh
        </button>
      </div>
    </div>
  );
};

export default MonitoringSettings;
