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
  const { getMonitoringStatus } = useChromeStorage();

  useEffect(() => {
    loadMonitoringStatus();
  }, []);

  const loadMonitoringStatus = async () => {
    const status = await getMonitoringStatus();
    setIsMonitoring(status || false);
  };

  return (
    <ErrorBoundary>
      <Router>
        <div className="app">
          <Header 
            isMonitoring={isMonitoring}
            onToggleMonitoring={() => setIsMonitoring(!isMonitoring)}
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
