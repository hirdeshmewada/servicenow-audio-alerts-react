import React from 'react';

const RecentTickets = ({ queues }) => {
  const getRecentTickets = () => {
    const allTickets = [];
    queues.forEach(queue => {
      if (queue.records && queue.records.length > 0) {
        queue.records.forEach(record => {
          allTickets.push({
            ...record,
            queueName: queue.name
          });
        });
      }
    });
    
    return allTickets.sort((a, b) => {
      return new Date(b.sys_created_on) - new Date(a.sys_created_on);
    });
  };

  const recentTickets = getRecentTickets();

  return (
    <div className="recent-tickets-card">
      <div className="card-header">
        <h3>Recent Tickets</h3>
        <span className="ticket-count">{recentTickets.length}</span>
      </div>
      <div className="card-content">
        <div className="ticket-list">
          {recentTickets.length === 0 ? (
            <div className="empty-state">No recent tickets</div>
          ) : (
            recentTickets.map((ticket, index) => (
              <div key={index} className="ticket-item">
                <div className="ticket-number">{ticket.number}</div>
                <div className="ticket-info">
                  <div className="ticket-description">{ticket.short_description}</div>
                  <div className="ticket-meta">
                    <span className="ticket-queue">{ticket.queueName}</span>
                    <span className="ticket-date">
                      {new Date(ticket.sys_created_on).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="ticket-severity">
                  <span className={`severity-badge ${ticket.severity?.toLowerCase()}`}>
                    {ticket.severity}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentTickets;
