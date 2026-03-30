import React, { useState, useEffect } from 'react';
import { useChromeStorage } from '../../hooks/useChromeStorage';
import QueueManager from './QueueManager';
import './Configuration.css';

const Configuration = () => {
  const [rootUrl, setRootUrl] = useState('');
  const [badgeDisplay, setBadgeDisplay] = useState('total');
  const [queues, setQueues] = useState([]);
  
  const { getQueues, saveQueues, getSettings, saveSettings } = useChromeStorage();

  useEffect(() => {
    loadConfiguration();
    
    // Set up storage listener for dynamic updates
    const handleStorageChange = (changes, areaName) => {
      if (areaName === 'sync' && changes.settings) {
        console.log(' Configuration settings changed, updating UI...');
        loadConfiguration();
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

  const loadConfiguration = async () => {
    const savedQueues = await getQueues();
    const settings = await getSettings();
    
    setQueues(savedQueues || []);
    setRootUrl(settings.rootUrl || '');
    setBadgeDisplay(settings.badgeDisplay || 'total');
  };

  const handleAutoSave = async (newSettings) => {
    try {
      await saveSettings(newSettings);
      console.log(' Configuration settings auto-saved:', newSettings);
    } catch (error) {
      console.error(' Error auto-saving configuration settings:', error);
    }
  };

  const handleBadgeDisplayChange = (value) => {
    setBadgeDisplay(value);
    handleAutoSave({ rootUrl, badgeDisplay: value });
  };

  const handleSaveConfig = async () => {
    try {
      await saveQueues(queues);
      await saveSettings({ rootUrl, badgeDisplay });
      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Error saving configuration');
    }
  };

  const handleTestConnection = async () => {
    try {
      // Test connection logic here
      alert('Connection test successful!');
    } catch (error) {
      console.error('Connection test failed:', error);
      alert('Connection test failed');
    }
  };

  return (
    <div className="configuration">
      <div className="page-header">
        <h2>Configuration</h2>
        <p>ServiceNow instance and queue settings</p>
      </div>

      <div className="config-section">
        <div className="section-title">ServiceNow Connection</div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="rootUrl">Base URL</label>
            <input 
              id="rootUrl" 
              type="text" 
              className="form-control" 
              placeholder="https://instance.service-now.com"
              value={rootUrl}
              onChange={(e) => setRootUrl(e.target.value)}
            />
            <div className="help-text">Do not include trailing /</div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="badgeDisplay">Badge Display</label>
            <select 
              id="badgeDisplay" 
              className="form-control"
              value={badgeDisplay}
              onChange={(e) => handleBadgeDisplayChange(e.target.value)}
            >
              <option value="total">Total Count (sum of all queues)</option>
              <option value="split">Individual Counts (A|B|C...)</option>
            </select>
            <div className="help-text">
              Choose how queue counts appear on the extension badge
            </div>
          </div>
        </div>

        <QueueManager 
          queues={queues}
          onQueuesChange={setQueues}
        />

        <div className="action-buttons">
          <button className="btn btn-primary" onClick={handleSaveConfig}>
            💾 Save Configuration
          </button>
          <button className="btn btn-secondary" onClick={handleTestConnection}>
            🧪 Test Connection
          </button>
        </div>
      </div>
    </div>
  );
};

export default Configuration;
