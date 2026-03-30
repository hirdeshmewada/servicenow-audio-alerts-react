import React from 'react';

const RecentTickets = ({ queues }) => {
  const getTicketsByQueue = () => {
    const ticketsByQueue = {};
    
    queues.forEach(queue => {
      if (queue.enabled && queue.records && queue.records.length > 0) {
        ticketsByQueue[queue.id] = {
          queueName: queue.name,
          queueUrl: queue.url,
          tickets: queue.records.map(record => ({
            ...record,
            queueName: queue.name,
            queueId: queue.id
          }))
        };
      }
    });
    
    return ticketsByQueue;
  };

  const getAllRecentTickets = () => {
    const allTickets = [];
    const ticketsByQueue = getTicketsByQueue();
    
    Object.values(ticketsByQueue).forEach(queue => {
      allTickets.push(...queue.tickets);
    });
    
    return allTickets.sort((a, b) => {
      return new Date(b.sys_created_on) - new Date(a.sys_created_on);
    }).slice(0, 10); // Limit to 10 most recent
  };

  const ticketsByQueue = getTicketsByQueue();
  const recentTickets = getAllRecentTickets();

  return (
    <div className="recent-tickets-card">
      <div className="card-header">
        <h3>Recent Tickets by Queue</h3>
        <span className="ticket-count">{recentTickets.length} Recent</span>
      </div>
      <div className="card-content">
        {Object.keys(ticketsByQueue).length === 0 ? (
          <div className="empty-state">No recent tickets from active queues</div>
        ) : (
          <div className="tickets-by-queue">
            {Object.entries(ticketsByQueue).map(([queueId, queueData]) => (
              <div key={queueId} className="queue-section">
                <div className="queue-header">
                  <h4 className="queue-title">{queueData.queueName}</h4>
                  <span className="queue-ticket-count">{queueData.tickets.length} tickets</span>
                </div>
                <div className="queue-tickets">
                  {queueData.tickets.slice(0, 3).map((ticket, index) => (
                    <div key={index} className="ticket-item">
                      <div className="ticket-number">{ticket.number}</div>
                      <div className="ticket-info">
                        <div className="ticket-description">{ticket.short_description}</div>
                        <div className="ticket-meta">
                          <span className="ticket-severity">
                            <span className={`severity-badge ${ticket.severity?.toLowerCase()}`}>
                              {ticket.severity}
                            </span>
                          </span>
                          <span className="ticket-date">
                            {new Date(ticket.sys_created_on).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {queueData.tickets.length > 3 && (
                    <div className="more-tickets">
                      +{queueData.tickets.length - 3} more tickets
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentTickets;
