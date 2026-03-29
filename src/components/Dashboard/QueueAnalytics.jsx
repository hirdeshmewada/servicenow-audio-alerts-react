import React from 'react';

const QueueAnalytics = ({ queues }) => {
  const getTotalCount = () => {
    return queues.reduce((total, queue) => total + (queue.currentCount || 0), 0);
  };

  const getTrend = (currentCount, previousCount) => {
    if (currentCount > previousCount) return '↑';
    if (currentCount < previousCount) return '↓';
    return '→';
  };

  return (
    <div className="queue-card">
      <div className="card-header">
        <h3>Queue Analytics</h3>
      </div>
      <div className="card-content">
        <div className="queue-grid">
          {queues.slice(0, 2).map((queue, index) => (
            <div key={queue.id} className="queue-item">
              <div className="queue-label">{queue.name || `Queue ${String.fromCharCode(65 + index)}`}</div>
              <div className="queue-count">{queue.currentCount || 0}</div>
              <div className="queue-trend">{getTrend(queue.currentCount, queue.previousCount)}</div>
            </div>
          ))}
          <div className="queue-item total">
            <div className="queue-label">Total</div>
            <div className="queue-count">{getTotalCount()}</div>
            <div className="queue-trend">→</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueueAnalytics;
