import React, { useState, useEffect } from 'react';
import './Popup.css';

const Popup = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Use Chrome API directly for better compatibility
      const result = await chrome.storage.local.get(['isMonitoring', 'queues']);
      setIsMonitoring(result.isMonitoring || false);
      setQueues(result.queues || []);
    } catch (error) {
      console.error('Error loading popup data:', error);
      setIsMonitoring(false);
      setQueues([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMonitoring = async () => {
    try {
      const newStatus = !isMonitoring;
      await chrome.storage.local.set({ isMonitoring: newStatus });
      setIsMonitoring(newStatus);
      
      // Send message to background script
      chrome.runtime.sendMessage({
        action: newStatus ? 'startMonitoring' : 'stopMonitoring'
      });
    } catch (error) {
      console.error('Error toggling monitoring:', error);
    }
  };

  const handleOpenOptions = () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html')
    });
    window.close();
  };

  const getTotalCount = () => {
    return queues.reduce((total, queue) => total + (queue.currentCount || 0), 0);
  };

  const getEnabledQueues = () => {
    return queues.filter(queue => queue.enabled);
  };

  if (loading) {
    return (
      <div className="popup">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="popup">
      <div className="popup-header">
        <div className="header-content">
          <img src="/icons/ITSM48.png" alt="SNOW Alerts" className="popup-logo" />
          <div className="header-info">
            <h1>SNOW Alerts</h1>
            <span className={`status ${isMonitoring ? 'active' : 'inactive'}`}>
              {isMonitoring ? 'Monitoring' : 'Stopped'}
            </span>
          </div>
        </div>
      </div>

      <div className="popup-content">
        <div className="status-section">
          <div className="status-info">
            <div className="info-item">
              <span className="label">Total Tickets:</span>
              <span className="value">{getTotalCount()}</span>
            </div>
            <div className="info-item">
              <span className="label">Active Queues:</span>
              <span className="value">{getEnabledQueues().length}</span>
            </div>
          </div>
          
          <button 
            className={`toggle-btn ${isMonitoring ? 'stop' : 'start'}`}
            onClick={handleToggleMonitoring}
          >
            <span className="btn-icon">{isMonitoring ? '⏸️' : '▶️'}</span>
            <span className="btn-text">{isMonitoring ? 'Stop' : 'Start'}</span>
          </button>
        </div>

        <div className="queue-summary">
          <h3>Queue Status</h3>
          {queues.length === 0 ? (
            <div className="empty-state">
              <p>No queues configured</p>
            </div>
          ) : (
            <div className="queue-list">
              {queues.slice(0, 3).map(queue => (
                <div key={queue.id} className={`queue-item ${queue.enabled ? 'enabled' : 'disabled'}`}>
                  <div className="queue-info">
                    <span className="queue-name">{queue.name}</span>
                    <span className="queue-count">{queue.currentCount || 0}</span>
                  </div>
                  <div className="queue-status">
                    <span className={`status-dot ${queue.enabled ? 'active' : 'inactive'}`}></span>
                  </div>
                </div>
              ))}
              {queues.length > 3 && (
                <div className="more-queues">
                  +{queues.length - 3} more queues
                </div>
              )}
            </div>
          )}
        </div>

        <div className="quick-actions">
          <button className="action-btn" onClick={handleOpenOptions}>
            ⚙️ Open Settings
          </button>
          <button 
            className="action-btn"
            onClick={() => chrome.runtime.sendMessage({ action: 'testAudio' })}
          >
            🔊 Test Audio
          </button>
        </div>
      </div>
    </div>
  );
};

export default Popup;
