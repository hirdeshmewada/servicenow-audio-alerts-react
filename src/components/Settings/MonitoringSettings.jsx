import React, { useState, useEffect } from 'react';
import { playAudio } from '../../services/audioManager';
import { showNotification } from '../../services/notificationSystem';

const MonitoringSettings = ({ settings, onSave }) => {
  const [monitoringSettings, setMonitoringSettings] = useState({
    pollInterval: 5,
    disableAlarm: false,
    disablePolling: false,
    alertCondition: 'nonZeroCount'
  });

  useEffect(() => {
    setMonitoringSettings({
      pollInterval: settings.pollInterval || 5,
      disableAlarm: settings.disableAlarm || false,
      disablePolling: settings.disablePolling || false,
      alertCondition: settings.alertCondition || 'nonZeroCount'
    });
  }, [settings]);

  const handleSave = () => {
    onSave(monitoringSettings);
  };

  const handleTestAudio = async () => {
    console.log('🔊 Testing audio notification');
    try {
      const success = await playAudio({
        volume: 70,
        playbackDuration: 5,
        loopAudio: false
      });
      if (success) {
        console.log('✅ Audio test successful');
      } else {
        console.error('❌ Audio test failed');
      }
    } catch (error) {
      console.error('❌ Error testing audio:', error);
    }
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
        <h3>Monitoring Controls</h3>
        
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

      <div className="settings-section">
        <h3>Alert Conditions</h3>
        
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

      <div className="settings-section">
        <h3>Polling Settings</h3>
        
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

      <div className="settings-section">
        <h3>Testing</h3>
        
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
  );
};

export default MonitoringSettings;
