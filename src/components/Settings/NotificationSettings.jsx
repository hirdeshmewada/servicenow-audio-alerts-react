import React, { useState, useEffect } from 'react';

const NotificationSettings = ({ settings, onSave }) => {
  const [notificationSettings, setNotificationSettings] = useState({
    enableDesktop: true,
    enableSound: true,
    quietHours: false,
    quietStart: '22:00',
    quietEnd: '08:00',
    showTicketDetails: true
  });

  useEffect(() => {
    setNotificationSettings({
      enableDesktop: settings.enableDesktop !== false,
      enableSound: settings.enableSound !== false,
      quietHours: settings.quietHours || false,
      quietStart: settings.quietStart || '22:00',
      quietEnd: settings.quietEnd || '08:00',
      showTicketDetails: settings.showTicketDetails !== false
    });
  }, [settings]);

  const handleSave = () => {
    onSave(notificationSettings);
  };

  const handleTestNotification = () => {
    // Test notification logic here
    console.log('Testing desktop notification');
  };

  return (
    <div className="notification-settings">
      <div className="settings-section">
        <h3>Notification Types</h3>
        
        <div className="toggle-control">
          <div className="toggle-info">
            <label className="toggle-label">Desktop Notifications</label>
            <p className="toggle-description">Show system notifications for new tickets</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.enableDesktop}
              onChange={(e) => setNotificationSettings(prev => ({ ...prev, enableDesktop: e.target.checked }))}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="toggle-control">
          <div className="toggle-info">
            <label className="toggle-label">Sound Notifications</label>
            <p className="toggle-description">Play audio alerts for new tickets</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.enableSound}
              onChange={(e) => setNotificationSettings(prev => ({ ...prev, enableSound: e.target.checked }))}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="toggle-control">
          <div className="toggle-info">
            <label className="toggle-label">Show Ticket Details</label>
            <p className="toggle-description">Include ticket number and description in notifications</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.showTicketDetails}
              onChange={(e) => setNotificationSettings(prev => ({ ...prev, showTicketDetails: e.target.checked }))}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Quiet Hours</h3>
        
        <div className="toggle-control">
          <div className="toggle-info">
            <label className="toggle-label">Enable Quiet Hours</label>
            <p className="toggle-description">Suppress notifications during specified hours</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.quietHours}
              onChange={(e) => setNotificationSettings(prev => ({ ...prev, quietHours: e.target.checked }))}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {notificationSettings.quietHours && (
          <div className="quiet-hours-config">
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input
                type="time"
                className="form-control"
                value={notificationSettings.quietStart}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, quietStart: e.target.value }))}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">End Time</label>
              <input
                type="time"
                className="form-control"
                value={notificationSettings.quietEnd}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, quietEnd: e.target.value }))}
              />
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>Test Notifications</h3>
        
        <div className="test-controls">
          <button className="btn btn-secondary" onClick={handleTestNotification}>
            🔔 Test Desktop Notification
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

export default NotificationSettings;
