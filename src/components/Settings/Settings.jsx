import React, { useState, useEffect } from 'react';
import { useChromeStorage } from '../../hooks/useChromeStorage';
import AudioSettings from './AudioSettings';
import MonitoringSettings from './MonitoringSettings';
import NotificationSettings from './NotificationSettings';
import './Settings.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('audio');
  const [settings, setSettings] = useState({});
  
  const { getSettings, saveSettings } = useChromeStorage();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const savedSettings = await getSettings();
    setSettings(savedSettings);
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      await saveSettings(newSettings);
      setSettings(newSettings);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    }
  };

  const tabs = [
    { id: 'audio', label: '🔊 Audio', icon: '🔊' },
    { id: 'monitoring', label: '👁️ Monitoring', icon: '👁️' },
    { id: 'notifications', label: '🔔 Notifications', icon: '🔔' }
  ];

  return (
    <div className="settings">
      <div className="page-header">
        <h2>Settings</h2>
        <p>Configure audio, monitoring, and notification preferences</p>
      </div>

      <div className="settings-container">
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="settings-content">
          {activeTab === 'audio' && (
            <AudioSettings 
              settings={settings}
              onSave={handleSaveSettings}
            />
          )}
          
          {activeTab === 'monitoring' && (
            <MonitoringSettings 
              settings={settings}
              onSave={handleSaveSettings}
            />
          )}
          
          {activeTab === 'notifications' && (
            <NotificationSettings 
              settings={settings}
              onSave={handleSaveSettings}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
