import React from 'react';
import './Header.css';

const Header = ({ isMonitoring, onToggleMonitoring }) => {
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
            className={`btn btn-primary ${isMonitoring ? 'stop' : 'start'}`}
            onClick={onToggleMonitoring}
          >
            <span className="btn-icon">{isMonitoring ? '⏸️' : '▶️'}</span>
            <span className="btn-text">{isMonitoring ? 'Stop' : 'Start'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
