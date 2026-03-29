import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navigation.css';

const Navigation = ({ currentPage, onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (page) => {
    onNavigate(page);
    navigate(`/${page === 'dashboard' ? '' : page}`);
  };

  const navItems = [
    { id: 'dashboard', icon: '📊', text: 'Dashboard' },
    { id: 'configuration', icon: '⚙️', text: 'Configuration' },
    { id: 'sound', icon: '🔊', text: 'Sound' },
    { id: 'monitoring', icon: '👁️', text: 'Monitoring' },
    { id: 'about', icon: 'ℹ️', text: 'About' }
  ];

  return (
    <nav className="vertical-nav">
      <div className="nav-header">
        <h3>Navigation</h3>
      </div>
      <ul className="nav-menu">
        {navItems.map(item => (
          <li 
            key={item.id} 
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => handleNavClick(item.id)}
          >
            <a href={`#${item.id}`}>
              <i className="nav-icon">{item.icon}</i>
              <span className="nav-text">{item.text}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navigation;
