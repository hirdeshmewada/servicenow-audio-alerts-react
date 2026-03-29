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
  const [lastPollAt, setLastPollAt] = useState(null);
  const [nextPollAt, setNextPollAt] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [nextPollIn, setNextPollIn] = useState('--:--');
  const [pollInterval, setPollInterval] = useState(5);
  
  const { getQueues, updateQueueCount } = useChromeStorage();
  const { fetchQueueData, loading, error } = useServiceNowAPI();
  const { showNotification } = useNotifications();

  useEffect(() => {
    loadRealtimeData();
    // Update every 5 seconds instead of every second to prevent blinking
    const interval = setInterval(() => {
      loadRealtimeData();
      updateNextPollIn();
    }, 5000);
    
    // Set up storage listener for dynamic updates
    const handleStorageChange = (changes, areaName) => {
      if (areaName === 'local' && (changes.settings || changes.isMonitoring || changes.lastPollAt || changes.nextPollAt || changes.pollInterval)) {
        console.log('🔄 Storage changed, updating dashboard...');
        loadRealtimeData();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      clearInterval(interval);
      if (chrome.storage.onChanged.hasListener(handleStorageChange)) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
    };
  }, []);

  const updateNextPollIn = () => {
    if (nextPollAt) {
      const now = new Date();
      const nextPoll = new Date(nextPollAt);
      const diff = nextPoll - now;
      
      if (diff > 0) {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setNextPollIn(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setNextPollIn('Polling...');
      }
    } else {
      setNextPollIn('--:--');
    }
  };

  useEffect(() => {
    updateNextPollIn();
    const interval = setInterval(updateNextPollIn, 1000);
    return () => clearInterval(interval);
  }, [nextPollAt]);

  const loadRealtimeData = async () => {
    try {
      console.log('=== DASHBOARD LOADING DATA ===');
      const result = await chrome.storage.local.get([
        'queues', 
        'lastPollAt', 
        'nextPollAt', 
        'isMonitoring',
        'pollInterval'
      ]);
      
      console.log('Storage data:', {
        isMonitoring: result.isMonitoring,
        lastPollAt: result.lastPollAt,
        nextPollAt: result.nextPollAt,
        pollInterval: result.pollInterval,
        queuesCount: result.queues?.length || 0
      });
      
      setQueues(result.queues || []);
      setLastPollAt(result.lastPollAt);
      setNextPollAt(result.nextPollAt);
      setIsMonitoring(result.isMonitoring || false);
      setPollInterval(result.pollInterval || 5);
      
      // Update system status based on monitoring state
      if (result.isMonitoring) {
        setSystemStatus('active');
      } else {
        setSystemStatus('inactive');
      }
    } catch (error) {
      console.error('Error loading real-time data:', error);
    }
  };

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
      setLastPollAt(new Date().toISOString());
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setIsRefreshing(false);
      setSystemStatus('idle');
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
        lastPoll={formatTime(lastPollAt)}
        nextPoll={formatTime(nextPollAt)}
        nextPollIn={nextPollIn}
        isMonitoring={isMonitoring}
        pollInterval={pollInterval}
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
