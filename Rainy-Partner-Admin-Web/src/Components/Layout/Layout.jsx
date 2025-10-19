import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../SideBar/Sidebar';
import './Layout.css';

const Layout = () => {
  return (
    <div className="layout-container">
      <aside className="sidebar">
        <Sidebar />
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
