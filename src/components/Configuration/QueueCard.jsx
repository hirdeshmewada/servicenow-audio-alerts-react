import React from 'react';
import './QueueCard.css';

const QueueCard = ({ queue, onEdit, onDelete, onToggle }) => {
  const getTrend = (current, previous) => {
    if (current > previous) return '↑';
    if (current < previous) return '↓';
    return '→';
  };

  return (
    <div className={`queue-card ${queue.enabled ? 'enabled' : 'disabled'}`}>
      <div className="queue-header">
        <div className="queue-info">
          <h4 className="queue-name">{queue.name}</h4>
          <p className="queue-url">{queue.url}</p>
        </div>
        <div className="queue-status">
          <span className={`status-indicator ${queue.enabled ? 'active' : 'inactive'}`}>
            {queue.enabled ? 'Active' : 'Disabled'}
          </span>
        </div>
      </div>
      
      <div className="queue-stats">
        <div className="stat-item">
          <span className="stat-label">Current Count:</span>
          <span className="stat-value">{queue.currentCount || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Trend:</span>
          <span className="stat-value trend">
            {getTrend(queue.currentCount, queue.previousCount)}
          </span>
        </div>
      </div>

      <div className="queue-actions">
        <button 
          className={`btn btn-sm ${queue.enabled ? 'btn-warning' : 'btn-success'}`}
          onClick={onToggle}
        >
          {queue.enabled ? '⏸️ Disable' : '▶️ Enable'}
        </button>
        <button className="btn btn-sm btn-primary" onClick={onEdit}>
          ✏️ Edit
        </button>
        <button className="btn btn-sm btn-danger" onClick={onDelete}>
          🗑️ Delete
        </button>
      </div>

      {queue.notificationText && (
        <div className="queue-notification">
          <span className="notification-label">Notification:</span>
          <span className="notification-text">{queue.notificationText}</span>
        </div>
      )}
    </div>
  );
};

export default QueueCard;
