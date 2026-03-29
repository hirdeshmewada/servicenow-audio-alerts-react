import React from 'react';
import './About.css';

const About = () => {
  return (
    <div className="about-page">
      <div className="page-header">
        <h2>About</h2>
        <p>Extension information and support</p>
      </div>

      <div className="about-content">
        <div className="about-card">
          <div className="about-header">
            <img src="/icons/ITSM128.png" alt="ServiceNow Audio Alerts" className="about-logo" />
            <div className="about-info">
              <h3>ServiceNow Audio Alerts</h3>
              <p className="version">Version 1.0 - React Edition</p>
              <p className="description">Professional queue monitoring system for ServiceNow with customizable audio alerts</p>
            </div>
          </div>

          <div className="about-details">
            <div className="detail-section">
              <h4>Features</h4>
              <ul className="feature-list">
                <li>Real-time ServiceNow queue monitoring</li>
                <li>Customizable audio notifications</li>
                <li>Professional dashboard with analytics</li>
                <li>Multi-queue management</li>
                <li>Chrome notifications</li>
                <li>Background polling</li>
                <li>Modern React-powered interface</li>
              </ul>
            </div>

            <div className="detail-section">
              <h4>Support</h4>
              <div className="support-info">
                <p><strong>Developer:</strong> Hirdesh Mewada</p>
                <p><strong>Email:</strong> <a href="mailto:hirdeshrajput143@gmail.com">hirdeshrajput143@gmail.com</a></p>
                <p><strong>GitHub:</strong> <a href="https://github.com/hirdeshmewada/servicenow-audio-alert-chrome-extension" target="_blank" rel="noopener noreferrer">hirdeshmewada/servicenow-audio-alert-chrome-extension</a></p>
              </div>
            </div>

            <div className="detail-section">
              <h4>Technologies</h4>
              <div className="tech-stack">
                <span className="tech-badge">React.js</span>
                <span className="tech-badge">Chrome Extensions API</span>
                <span className="tech-badge">Web Audio API</span>
                <span className="tech-badge">ServiceNow REST API</span>
                <span className="tech-badge">Manifest V3</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
