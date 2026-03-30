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
  const [systemStatus, setSystemStatus] = useState('idle');
  const [lastPollAt, setLastPollAt] = useState(null);
  const [nextPollAt, setNextPollAt] = useState(null);
  const [nextPollIn, setNextPollIn] = useState('--:--');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [pollInterval, setPollInterval] = useState(5);
  const [error, setError] = useState(null);
  
  const { getQueues, updateQueueCount } = useChromeStorage();
  const { fetchQueueData, loading, error: apiError } = useServiceNowAPI();
  const { showNotification } = useNotifications();

  useEffect(() => {
    loadRealtimeData();
    
    // Only run timer if monitoring is active
    let interval;
    if (isMonitoring) {
      interval = setInterval(() => {
        loadRealtimeData();
        updateNextPollIn();
      }, 5000);
      console.log('⏰ Dashboard timer started (monitoring active)');
    } else {
      console.log('⏸️ Dashboard timer stopped (monitoring inactive)');
    }
    
    // Set up storage listener for dynamic updates
    const handleStorageChange = (changes, areaName) => {
      console.log('🔄 Dashboard storage changed:', areaName, changes);
      
      // Reload data for any relevant changes
      const shouldReload = (
        (areaName === 'local' && (
          changes.isMonitoring || 
          changes.queues || 
          changes.lastPollAt || 
          changes.nextPollAt
        )) ||
        (areaName === 'sync' && (
          changes.settings || 
          changes.pollInterval
        ))
      );
      
      if (shouldReload) {
        console.log('🔄 Reloading dashboard data...');
        loadRealtimeData();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      if (interval) clearInterval(interval);
      if (chrome.storage.onChanged.hasListener(handleStorageChange)) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
    };
  }, [isMonitoring]);

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
      // Read monitoring state from local storage
      const localResult = await chrome.storage.local.get([
        'queues', 
        'lastPollAt', 
        'nextPollAt', 
        'isMonitoring'
      ]);
      
      // Read pollInterval from sync storage (settings)
      const syncResult = await chrome.storage.sync.get(['settings']);
      const settings = syncResult.settings || {};
      
      console.log('📊 Dashboard loading data:', {
        isMonitoring: localResult.isMonitoring,
        queuesCount: localResult.queues?.length || 0,
        lastPollAt: localResult.lastPollAt,
        nextPollAt: localResult.nextPollAt,
        pollInterval: settings.pollInterval || 5
      });
      
      console.log('Storage data:', {
        isMonitoring: localResult.isMonitoring,
        lastPollAt: localResult.lastPollAt,
        nextPollAt: localResult.nextPollAt,
        pollInterval: settings.pollInterval || 5,
        queuesCount: localResult.queues?.length || 0
      });
      
      setIsMonitoring(localResult.isMonitoring || false);
      setQueues(localResult.queues || []);
      setLastPollAt(localResult.lastPollAt);
      setNextPollAt(localResult.nextPollAt);
      setPollInterval(settings.pollInterval || 5);
      
      // Update system status based on monitoring state
      if (localResult.isMonitoring) {
        setSystemStatus('active');
      } else {
        setSystemStatus('inactive');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const loadQueues = async () => {
    const savedQueues = await getQueues();
    setQueues(savedQueues || []);
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
        <div className="dashboard-title">
          <h2>Real-time monitoring overview and statistics</h2>
        </div>
      </div>
      
      {/* Power BI-style top row with status and analytics */}
      <div className="dashboard-top-row">
        <SystemStatus 
          status={systemStatus} 
          lastPoll={formatTime(lastPollAt)}
          nextPoll={formatTime(nextPollAt)}
          nextPollIn={nextPollIn}
          isMonitoring={isMonitoring}
          pollInterval={pollInterval}
        />
        <QueueAnalytics queues={queues} />
      </div>
      
      {/* Recent Tickets section below */}
      <div className="recent-tickets-section">
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
