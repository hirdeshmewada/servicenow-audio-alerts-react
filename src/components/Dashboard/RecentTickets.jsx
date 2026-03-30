import React from 'react';

const RecentTickets = ({ queues }) => {
  console.log('📋 RecentTickets received queues:', queues.length);
  console.log('📋 Queue details:', queues.map(q => ({ 
    name: q.name, 
    enabled: q.enabled, 
    hasRecords: !!q.records, 
    recordCount: q.records?.length || 0 
  })));
  
  const handleTicketClick = (ticket, queueUrl) => {
    // Open the ticket in ServiceNow from the correct queue
    const baseUrl = queueUrl.split('?')[0];
    const ticketUrl = `${baseUrl}?sysparm_query=number=${ticket.number}&sysparm_stack=incident`;
    console.log('🔗 Opening ticket:', ticket.number, 'from queue:', queueUrl);
    console.log('🔗 Full URL:', ticketUrl);
    chrome.tabs.create({ url: ticketUrl });
  };

  const getTicketsByQueue = () => {
    const ticketsByQueue = {};
    
    console.log('🔍 Processing queues for tickets...');
    queues.forEach(queue => {
      console.log(`📋 Queue: ${queue.name}, enabled: ${queue.enabled}, records: ${queue.records?.length || 0}`);
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
        console.log(`✅ Added ${queue.records.length} tickets from ${queue.name}`);
      }
    });
    
    console.log('📊 Final ticketsByQueue:', Object.keys(ticketsByQueue).length, 'queues with tickets');
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
                  <div className="queue-title-with-count">
                    <span className="queue-ticket-count">{queueData.tickets.length}</span>
                    <h4 className="queue-title">{queueData.queueName}</h4>
                  </div>
                </div>
                <div className="queue-tickets">
                  {queueData.tickets.map((ticket, index) => (
                    <div key={index} className="ticket-item clickable-ticket" 
                         onClick={() => handleTicketClick(ticket, queueData.queueUrl)}
                         title={`Click to open ticket ${ticket.number} in ServiceNow`}>
                      <div className="ticket-number">
                        {ticket.number}
                        <span className="click-indicator">🔗</span>
                      </div>
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
