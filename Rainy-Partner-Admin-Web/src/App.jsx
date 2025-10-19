// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Components/Layout/Layout';
import Home from './Components/Home/Home';
import Plumbers from './pages/Plumbers/Plumbers';
import KYCs from './pages/KYCs/KYCs';
import Installations from './pages/Installations/Installations';
import Orders from './pages/Orders/Orders';
import Settings from './pages/Settings/Settings';
import './App.css';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />

          <Route path="plumbers" element={<Plumbers />} />
          <Route path="kycs" element={<KYCs />} />
          <Route path="installations" element={<Installations />} />
          <Route path="orders" element={<Orders />} />
          <Route path="settings" element={<Settings />} />

          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
