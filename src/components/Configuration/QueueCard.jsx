import React from 'react';
import './QueueCard.css';

const QueueCard = ({ queue, onEdit, onDelete, onToggle, showUrl }) => {
  const getTrend = (current, previous) => {
    if (current > previous) return { symbol: '↑', class: 'up' };
    if (current < previous) return { symbol: '↓', class: 'down' };
    return { symbol: '→', class: 'neutral' };
  };

  const trend = getTrend(queue.currentCount, queue.previousCount);

  const handleEditClick = () => {
    onEdit();
  };

  return (
    <div className={`queue-card ${queue.enabled ? 'enabled' : 'disabled'} ${showUrl ? 'show-url' : ''}`}>
      <div className="queue-header">
        <div className="queue-info">
          <h4 className="queue-name">{queue.name}</h4>
          {showUrl && (
            <div className="queue-url">{queue.url}</div>
          )}
        </div>
        <div className="queue-status">
          <span className={`status-indicator ${queue.enabled ? 'active' : 'inactive'}`}>
            {queue.enabled ? 'Active' : 'Disabled'}
          </span>
        </div>
      </div>
      
      <div className="queue-stats">
        <div className="stat-item">
          <span className="stat-label">Current Count</span>
          <span className="stat-value">{queue.currentCount || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Trend</span>
          <span className={`stat-value trend ${trend.class}`}>
            {trend.symbol}
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
        <button className="btn btn-sm btn-primary" onClick={handleEditClick}>
          ✏️ Edit
        </button>
        <button className="btn btn-sm btn-danger" onClick={onDelete}>
          🗑️ Delete
        </button>
      </div>

      {queue.notificationText && (
        <div className="queue-notification">
          <span className="notification-label">Notification</span>
          <span className="notification-text">{queue.notificationText}</span>
        </div>
      )}
    </div>
  );
};

export default QueueCard;
