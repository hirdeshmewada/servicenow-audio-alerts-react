import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/Shared/ErrorBoundary';
import Header from './components/Shared/Header';
import Navigation from './components/Shared/Navigation';
import Dashboard from './components/Dashboard/Dashboard';
import Configuration from './components/Configuration/Configuration';
import Sound from './components/Sound/Sound';
import Monitoring from './components/Monitoring/Monitoring';
import About from './components/About/About';
import { useChromeStorage } from './hooks/useChromeStorage';
import './styles/globals.css';

const App = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const { getMonitoringStatus, setMonitoringStatus } = useChromeStorage();

  useEffect(() => {
    loadMonitoringStatus();
    
    // Listen for storage changes to sync monitoring state
    const handleStorageChange = (changes, areaName) => {
      if (areaName === 'local' && changes.isMonitoring) {
        console.log('🔄 App monitoring state changed:', changes.isMonitoring.newValue);
        setIsMonitoring(changes.isMonitoring.newValue);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const loadMonitoringStatus = async () => {
    const status = await getMonitoringStatus();
    setIsMonitoring(status || false);
  };

  const handleToggleMonitoring = async () => {
    try {
      if (isMonitoring) {
        console.log('🛑 App stopping monitoring...');
        const response = await chrome.runtime.sendMessage({ type: 'STOP_MONITORING' });
        if (response.success) {
          console.log('✅ App monitoring stopped successfully');
          setIsMonitoring(false);
        } else {
          console.error('❌ App failed to stop monitoring:', response.error);
        }
      } else {
        console.log('▶️ App starting monitoring...');
        const response = await chrome.runtime.sendMessage({ type: 'START_MONITORING' });
        if (response.success) {
          console.log('✅ App monitoring started successfully');
          setIsMonitoring(true);
        } else {
          console.error('❌ App failed to start monitoring:', response.error);
        }
      }
    } catch (error) {
      console.error('❌ App error toggling monitoring:', error);
    }
  };

  return (
    <ErrorBoundary>
      <Router>
        <div className="app">
          <Header 
            isMonitoring={isMonitoring}
            onToggleMonitoring={handleToggleMonitoring}
          />
          <div className="main-layout">
            <Navigation 
              currentPage={currentPage}
              onNavigate={setCurrentPage}
            />
            <main className="content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/configuration" element={<Configuration />} />
                <Route path="/sound" element={<Sound />} />
                <Route path="/monitoring" element={<Monitoring />} />
                <Route path="/about" element={<About />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
