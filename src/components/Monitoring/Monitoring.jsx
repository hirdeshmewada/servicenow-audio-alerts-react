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
    alertCondition: 'nonZeroCount'
  });
  
  const { getSettings, saveSettings } = useChromeStorage();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await getSettings();
    setMonitoringSettings({
      pollInterval: settings.pollInterval || 5,
      disableAlarm: settings.disableAlarm || false,
      disablePolling: settings.disablePolling || false,
      alertCondition: settings.alertCondition || 'nonZeroCount'
    });
  };

  const handleSave = async () => {
    await saveSettings(monitoringSettings);
    alert('Monitoring settings saved successfully!');
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
                  onChange={(e) => setMonitoringSettings(prev => ({ ...prev, disableAlarm: e.target.checked }))}
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
                  onChange={(e) => setMonitoringSettings(prev => ({ ...prev, disablePolling: e.target.checked }))}
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
                onChange={(e) => setMonitoringSettings(prev => ({ ...prev, alertCondition: e.target.value }))}
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
                onChange={(e) => setMonitoringSettings(prev => ({ ...prev, alertCondition: e.target.value }))}
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
              onChange={(e) => setMonitoringSettings(prev => ({ ...prev, pollInterval: parseInt(e.target.value) }))}
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
