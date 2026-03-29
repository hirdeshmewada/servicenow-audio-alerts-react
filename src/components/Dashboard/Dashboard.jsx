import React, { useState, useEffect } from 'react';
import { useChromeStorage } from '../../hooks/useChromeStorage';
import { useServiceNowAPI } from '../../hooks/useServiceNowAPI';
import { useNotifications } from '../../hooks/useNotifications';
import QueueAnalytics from './QueueAnalytics';
import SystemStatus from './SystemStatus';
import RecentTickets from './RecentTickets';
import './Dashboard.css';

const Dashboard = () => {
  const [queues, setQueues] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [systemStatus, setSystemStatus] = useState('inactive');
  const [lastPoll, setLastPoll] = useState('Never');
  
  const { getQueues, updateQueueCount } = useChromeStorage();
  const { fetchQueueData, loading, error } = useServiceNowAPI();
  const { showNotification } = useNotifications();

  useEffect(() => {
    loadQueues();
    const interval = setInterval(loadQueues, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadQueues = async () => {
    const savedQueues = await getQueues();
    setQueues(savedQueues || []);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setSystemStatus('active');
    
    try {
      for (const queue of queues) {
        if (queue.enabled) {
          const data = await fetchQueueData(queue.url);
          await updateQueueCount(queue.id, data.quantity);
          
          if (data.quantity > 0) {
            showNotification(
              `New tickets in ${queue.name}`,
              `${data.quantity} tickets found`,
              'info'
            );
          }
        }
      }
      setLastPoll(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setIsRefreshing(false);
      setSystemStatus('idle');
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Real-time monitoring overview and statistics</h2>
        <button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          className={`refresh-btn ${isRefreshing ? 'loading' : ''}`}
        >
          {isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>
      
      <SystemStatus 
        status={systemStatus} 
        lastPoll={lastPoll}
        isMonitoring={queues.some(q => q.enabled)}
      />
      
      <div className="dashboard-grid">
        <QueueAnalytics queues={queues} />
        <RecentTickets queues={queues} />
      </div>
      
      {error && (
        <div className="error-message">
          ❌ Error: {error}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
