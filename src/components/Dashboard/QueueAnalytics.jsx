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

  const getEnabledQueues = () => {
    return queues.filter(queue => queue.enabled);
  };

  const enabledQueues = getEnabledQueues();

  return (
    <div className="queue-card">
      <div className="card-header">
        <h3>Queue Analytics</h3>
        <span className="queue-count-badge">{enabledQueues.length} Active</span>
      </div>
      <div className="card-content">
        <div className="queue-grid">
          {enabledQueues.length === 0 ? (
            <div className="empty-queues">
              <div className="empty-state">No active queues</div>
            </div>
          ) : (
            <>
              {enabledQueues.map((queue) => (
                <div key={queue.id} className="queue-item">
                  <div className="queue-label">{queue.name || 'Unnamed Queue'}</div>
                  <div className="queue-count">{queue.currentCount || 0}</div>
                  <div className="queue-trend">{getTrend(queue.currentCount, queue.previousCount)}</div>
                </div>
              ))}
              <div className="queue-item total">
                <div className="queue-label">Total</div>
                <div className="queue-count">{getTotalCount()}</div>
                <div className="queue-trend">→</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueueAnalytics;
