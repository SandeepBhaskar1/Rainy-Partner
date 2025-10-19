import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Users, FileText, MapPin, Package, Settings, ClipboardList } from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchValue, setSearchValue] = useState('');

  const menuItems = [
    { name: 'Overview', icon: ClipboardList, path: '/' },
    { name: 'Plumbers', icon: Users, path: '/plumbers' },
    { name: 'KYCs', icon: FileText, path: '/kycs' },
    { name: 'Installations', icon: MapPin, path: '/installations' },
    { name: 'Orders', icon: Package, path: '/orders' },
    { name: 'Settings', icon: Settings, path: '/settings' }
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="sidebar-container">
      {/* Header */}
      <div className="sidebar-header">
        <div className="brand-text">RAINY</div>
        <div className="portal-text">Admin Portal</div>
      </div>

      {/* Global Search */}
      <div className="search-section">
        <div className="search-label">Global Search</div>
        <div className="search-input-container">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search plumbers, orders, installations..."
            className="search-input"
          />
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="navigation-menu">
        {menuItems.map((item) => (
          <button
            key={item.name}
            onClick={() => handleNavigation(item.path)}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.icon && <item.icon size={18} className="nav-icon" />}
            <span className="nav-text">{item.name}</span>
          </button>
        ))}
      </nav>

      {/* Quick Tip */}
      <div className="quick-tip">
        <div className="tip-title">Quick Tip</div>
        <div className="tip-content">
          Approve KYC → Assign installation → Start work → Photos in app → Review → Complete.
        </div>
      </div>
    </div>
  );
};

export default Sidebar;