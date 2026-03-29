import React, { useState } from 'react';
import './Header.css';

const Header = ({ isMonitoring, onToggleMonitoring }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleMonitoring = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      console.log('🔄 Header toggle monitoring clicked, current status:', isMonitoring);
      
      if (isMonitoring) {
        console.log('🛑 Stopping monitoring from header...');
        const response = await chrome.runtime.sendMessage({ type: 'STOP_MONITORING' });
        if (response.success) {
          console.log('✅ Monitoring stopped successfully from header');
          onToggleMonitoring();
        } else {
          console.error('❌ Failed to stop monitoring from header:', response.error);
        }
      } else {
        console.log('▶️ Starting monitoring from header...');
        const response = await chrome.runtime.sendMessage({ type: 'START_MONITORING' });
        if (response.success) {
          console.log('✅ Monitoring started successfully from header');
          onToggleMonitoring();
        } else {
          console.error('❌ Failed to start monitoring from header:', response.error);
        }
      }
    } catch (error) {
      console.error('❌ Error toggling monitoring from header:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <header className="main-header">
      <div className="header-content">
        <div className="header-left">
          <div className="logo-section">
            <img src="/icons/ITSM50.png" alt="ServiceNow Audio Alerts" className="logo" />
            <div className="title-section">
              <h1>SNOW Audio Alerts</h1>
              <p>ServiceNow Queue Monitoring System</p>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="status-indicator">
            <span className={`status-dot ${isMonitoring ? 'active' : 'inactive'}`}></span>
            <span className="status-text">{isMonitoring ? 'Monitoring' : 'Stopped'}</span>
          </div>
          <button 
            className={`btn btn-primary ${isMonitoring ? 'stop' : 'start'} ${isLoading ? 'loading' : ''}`}
            onClick={handleToggleMonitoring}
            disabled={isLoading}
          >
            <span className="btn-icon">{isLoading ? '🔄' : (isMonitoring ? '⏸️' : '▶️')}</span>
            <span className="btn-text">{isLoading ? 'Loading...' : (isMonitoring ? 'Stop' : 'Start')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
