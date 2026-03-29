import React from 'react';

const SystemStatus = ({ status, lastPoll, nextPoll, nextPollIn, isMonitoring }) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'idle':
        return 'Idle';
      default:
        return 'Inactive';
    }
  };

  return (
    <div className="status-card">
      <div className="card-header">
        <h3>System Status</h3>
        <span className="status-badge">{getStatusBadge()}</span>
      </div>
      <div className="card-content">
        <div className="status-info">
          <div className="info-row">
            <span className="label">Monitoring:</span>
            <span className="value">{isMonitoring ? 'Active' : 'Inactive'}</span>
          </div>
          <div className="info-row">
            <span className="label">Last Poll:</span>
            <span className="value">{lastPoll}</span>
          </div>
          <div className="info-row">
            <span className="label">Next Poll:</span>
            <span className="value">{nextPoll}</span>
          </div>
        </div>
        <div className="countdown-container">
          <div className="countdown-label">Next Poll In</div>
          <div className="countdown-timer">
            <span className="countdown-value">{nextPollIn}</span>
            <div className="countdown-progress">
              <div className="countdown-progress-bar"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;
