import React, { useState, useEffect } from 'react';
import { playAudio } from '../../services/audioManager';
import { showNotification } from '../../services/notificationSystem';
import { useChromeStorage } from '../../hooks/useChromeStorage';
import './Monitoring.css';

const Monitoring = () => {
  const [monitoringSettings, setMonitoringSettings] = useState({
    pollInterval: 5,
    disableAlarm: false,
    disablePolling: false,
    alertCondition: 'nonZeroCount',
    audioSource: 'default',
    volume: 70,
    playbackDuration: 5,
    loopAudio: false
  });
  
  const { getSettings, saveSettings } = useChromeStorage();

  useEffect(() => {
    loadSettings();
    
    // Set up storage listener for dynamic updates
    const handleStorageChange = (changes, areaName) => {
      if (areaName === 'sync' && changes.settings) {
        console.log('🔄 Monitoring settings changed in sync storage, updating UI...');
        loadSettings();
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

  const loadSettings = async () => {
    const settings = await getSettings();
    setMonitoringSettings({
      pollInterval: settings.pollInterval || 5,
      disableAlarm: settings.disableAlarm || false,
      disablePolling: settings.disablePolling || false,
      alertCondition: settings.alertCondition || 'nonZeroCount',
      audioSource: settings.audioSource || 'default',
      volume: settings.volume || 70,
      playbackDuration: settings.playbackDuration || 5,
      loopAudio: settings.loopAudio || false
    });
  };

  const handleSave = async () => {
    await saveSettings(monitoringSettings);
    alert('Monitoring settings saved successfully!');
  };

  const handleAutoSave = async (newSettings) => {
    try {
      await saveSettings(newSettings);
      console.log('✅ Monitoring settings auto-saved:', newSettings);
    } catch (error) {
      console.error('❌ Error auto-saving monitoring settings:', error);
    }
  };

  const handleSettingChange = (setting, value) => {
    const newSettings = { ...monitoringSettings, [setting]: value };
    setMonitoringSettings(newSettings);
    handleAutoSave(newSettings);
  };

  const handleTestAudio = () => {
    console.log('🔊 Testing audio notification');
    console.log('📊 Current audio source:', monitoringSettings.audioSource);
    console.log('🔊 Audio settings:', {
      audioSource: monitoringSettings.audioSource,
      volume: monitoringSettings.volume,
      playbackDuration: monitoringSettings.playbackDuration
    });
    
    // Fire and forget - like old extension
    chrome.runtime.sendMessage({
      type: 'PLAY_AUDIO',
      audioSource: monitoringSettings.audioSource || 'default',
      settings: {
        volume: monitoringSettings.volume || 70,
        playbackDuration: monitoringSettings.playbackDuration || 5,
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
    <div className="monitoring-page">
      <div className="page-header">
        <h2>Monitoring Controls</h2>
        <p>Advanced monitoring and alert settings</p>
      </div>

      <div className="monitoring-sections">
        <div className="monitoring-section">
          <div className="section-title">Monitoring Controls</div>
          <div className="control-grid">
            <div className="toggle-control">
              <div className="toggle-info">
                <label className="toggle-label">Disable Alarm</label>
                <p className="toggle-description">Stops sound but still tracks tickets</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox"
                  checked={monitoringSettings.disableAlarm}
                  onChange={(e) => handleSettingChange('disableAlarm', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="toggle-control">
              <div className="toggle-info">
                <label className="toggle-label">Disable Polling</label>
                <p className="toggle-description">Stops everything</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox"
                  checked={monitoringSettings.disablePolling}
                  onChange={(e) => handleSettingChange('disablePolling', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div className="monitoring-section">
          <div className="section-title">Alert Conditions</div>
          <div className="radio-group">
            <label className="radio-label">
              <input 
                type="radio"
                name="alertCondition"
                value="nonZeroCount"
                checked={monitoringSettings.alertCondition === 'nonZeroCount'}
                onChange={(e) => handleSettingChange('alertCondition', e.target.value)}
              />
              <span className="radio-custom"></span>
              Count is {'>'} 0
            </label>
            <label className="radio-label">
              <input 
                type="radio"
                name="alertCondition"
                value="newTicket"
                checked={monitoringSettings.alertCondition === 'newTicket'}
                onChange={(e) => handleSettingChange('alertCondition', e.target.value)}
              />
              <span className="radio-custom"></span>
              New ticket appears
            </label>
          </div>
        </div>

        <div className="monitoring-section">
          <div className="section-title">Polling Settings</div>
          <div className="form-group">
            <label className="form-label">Poll Interval (minutes)</label>
            <input 
              type="number" 
              className="form-control" 
              placeholder="5" 
              min="1" 
              max="60"
              value={monitoringSettings.pollInterval}
              onChange={(e) => handleSettingChange('pollInterval', parseInt(e.target.value) || 5)}
            />
            <div className="help-text">Default is 5 minutes</div>
          </div>
        </div>

        <div className="monitoring-section">
          <div className="section-title">Testing</div>
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
        </div>
      </div>
    </div>
  );
};

export default Monitoring;
