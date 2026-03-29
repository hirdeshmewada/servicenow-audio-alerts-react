import React, { useState, useEffect } from 'react';
import './Popup.css';

const Popup = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastPollAt, setLastPollAt] = useState(null);
  const [nextPollAt, setNextPollAt] = useState(null);
  const [nextPollIn, setNextPollIn] = useState('--:--');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadData();
    // Update every 5 seconds instead of every second to prevent blinking
    const interval = setInterval(() => {
      loadData();
      updateNextPollIn();
    }, 5000);
    
    // Set up storage listener for dynamic updates
    const handleStorageChange = (changes, areaName) => {
      if (areaName === 'local' && (changes.settings || changes.isMonitoring || changes.lastPollAt || changes.nextPollAt)) {
        console.log('🔄 Storage changed, updating popup...');
        loadData();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      clearInterval(interval);
      if (chrome.storage.onChanged.hasListener(handleStorageChange)) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
    };
  }, []);

  const updateNextPollIn = () => {
    if (nextPollAt) {
      const now = new Date();
      const nextPoll = new Date(nextPollAt);
      const diff = nextPoll - now;
      
      if (diff > 0) {
        const totalSeconds = Math.floor(diff / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        setNextPollIn(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        
        // Calculate progress percentage (assuming 5-minute polling interval)
        const pollingInterval = 5 * 60 * 1000; // 5 minutes in ms
        const elapsed = pollingInterval - diff;
        const progress = Math.max(0, Math.min(100, (elapsed / pollingInterval) * 100));
        setProgress(progress);
      } else {
        setNextPollIn('Polling...');
        setProgress(0);
      }
    } else {
      setNextPollIn('--:--');
      setProgress(0);
    }
  };

  useEffect(() => {
    updateNextPollIn();
    // Update countdown every second for smooth countdown
    const interval = setInterval(updateNextPollIn, 1000);
    return () => clearInterval(interval);
  }, [nextPollAt]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Use Chrome API directly for better compatibility
      const result = await chrome.storage.local.get([
        'isMonitoring', 
        'queues', 
        'lastPollAt', 
        'nextPollAt'
      ]);
      setIsMonitoring(result.isMonitoring || false);
      setQueues(result.queues || []);
      setLastPollAt(result.lastPollAt);
      setNextPollAt(result.nextPollAt);
    } catch (error) {
      console.error('Error loading popup data:', error);
      setIsMonitoring(false);
      setQueues([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleToggleMonitoring = async () => {
    try {
      if (isMonitoring) {
        await chrome.runtime.sendMessage({ type: 'STOP_MONITORING' });
        setIsMonitoring(false);
      } else {
        await chrome.runtime.sendMessage({ type: 'START_MONITORING' });
        setIsMonitoring(true);
      }
    } catch (error) {
      console.error('Error toggling monitoring:', error);
    }
  };

  const handleTestAudio = () => {
    console.log('🔊 Testing audio from popup...');
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
          <img src="icons/ITSM128.png" alt="ServiceNow Alerts" className="popup-logo" />
          <div className="header-info">
            <h1>SNOW Alerts</h1>
            <span className={`status ${isMonitoring ? 'active' : 'inactive'}`}>
              {isMonitoring ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="header-actions">
            <button className="header-btn settings" onClick={handleOpenOptions}>
              ⚙️
            </button>
            <button className="header-btn test-audio" onClick={handleTestAudio}>
              🔊
            </button>
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
            <div className="info-item">
              <span className="label">Last Poll:</span>
              <span className="value">{formatTime(lastPollAt)}</span>
            </div>
            <div className="info-item">
              <span className="label">Next Poll:</span>
              <span className="value">{formatTime(nextPollAt)}</span>
            </div>
            <div className="info-item">
              <span className="label">Next Poll In:</span>
              <span className="value">{nextPollIn}</span>
            </div>
          </div>
          
          <div className="progress-container">
            <div className="progress-label">Next Poll Progress</div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="progress-text">{Math.round(progress)}%</div>
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
                    {queue.error && (
                      <span className="error-indicator" title={queue.error}>⚠️</span>
                    )}
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
            onClick={handleTestAudio}
          >
            🔊 Test Audio
          </button>
        </div>
      </div>
    </div>
  );
};

export default Popup;
