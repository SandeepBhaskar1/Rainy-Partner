import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Users, FileText, MapPin, Package, Settings, ClipboardList } from 'lucide-react';
import './Sidebar.css';
import axios from 'axios';
import api from '../../api/axiosInstence';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchValue, setSearchValue] = useState('');
  
  const userRole = useMemo(() => {
    const storedUser = sessionStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        return parsedUser?.role;
      } catch (error) {
        console.error("Error parsing coordinator data:", error);
        return null;
      }
    }
    return null;
  }, []);

const handleLogout = async () => {
  try {
    await api.post(
      `auth/admin-logout`,
      {},
    );
    
    sessionStorage.removeItem('user');
    navigate('/login', { replace: true });
  } catch (error) {
    console.error('Error occurred while logging out:', error);
    sessionStorage.removeItem('user');
    navigate('/login', { replace: true });
  }
};


  const allMenuItems = [
    { name: 'Overview', icon: ClipboardList, path: '/' },
    { name: 'Plumbers', icon: Users, path: '/plumbers', adminOnly: true },
    { name: 'Plumbers', icon: Users, path: '/coordinator-plumbers', coordinatorOnly: true },
    { name: 'Co-Ordinators', icon: Users, path: '/coordinators', adminOnly: true },
    { name: 'KYCs', icon: FileText, path: '/kycs', adminOnly: true },
    { name: 'Installations', icon: MapPin, path: '/admin-installations', adminOnly: true },
    { name: 'Installations', icon: MapPin, path: '/installations', coordinatorOnly: true },
    { name: 'Orders', icon: Package, path: '/admin-orders', adminOnly: true },
    { name: 'Orders', icon: Package, path: '/orders', coordinatorOnly: true },
    { name: 'Settings', icon: Settings, path: '/settings' }
  ];

  const menuItems = useMemo(() => {
    return allMenuItems.filter(item => {
      if (item.adminOnly && userRole !== 'ADMIN') {
        return false;
      }
      if (item.coordinatorOnly && userRole !== 'COORDINATOR') {
        return false
      }
      return true;
    });
  }, [userRole]);

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


        <div className='logout-button'>
          <button onClick={handleLogout}>Logout</button>
        </div>
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