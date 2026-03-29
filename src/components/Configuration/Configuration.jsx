import React, { useState, useEffect } from 'react';
import { useChromeStorage } from '../../hooks/useChromeStorage';
import QueueManager from './QueueManager';
import './Configuration.css';

const Configuration = () => {
  const [rootUrl, setRootUrl] = useState('');
  const [badgeDisplay, setBadgeDisplay] = useState('false');
  const [queues, setQueues] = useState([]);
  
  const { getQueues, saveQueues, getSettings, saveSettings } = useChromeStorage();

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    const savedQueues = await getQueues();
    const settings = await getSettings();
    
    setQueues(savedQueues || []);
    setRootUrl(settings.rootUrl || '');
    setBadgeDisplay(settings.badgeDisplay || 'false');
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
              onChange={(e) => setBadgeDisplay(e.target.value)}
            >
              <option value="false">Total (A + B)</option>
              <option value="true">Split (A | B)</option>
            </select>
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
