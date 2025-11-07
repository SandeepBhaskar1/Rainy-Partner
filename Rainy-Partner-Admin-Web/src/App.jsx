import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Components/Layout/Layout';
import Home from './Components/Home/Home';
import Plumbers from './pages/Plumbers/Plumbers';
import KYCs from './pages/KYCs/KYCs';
import Installations from './pages/Installations/Installations';
import InstallationForCoord from './pages/Installations/InstallationsForCoord';
import Orders from './pages/Orders/Orders';
import CoordOrders from './pages/Orders/CoordOrders';
import Settings from './pages/Settings/Settings';
import Login from './pages/Login/Login';
import './App.css';
import AdminRegister from './pages/Admin-Register/AdminRegister';
import CoOrdinators from './pages/CoOrdinators/CoOrdinators';
import CoordinatorLogin from './pages/Login/CoordinatorLogin';
import CoordinatorPlumber from './pages/Plumbers/CoordinatorPlumber';
import ForgotPassword from './pages/Login/ForgotPassword';
import { useAuth } from './context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "40px" }}>Checking session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<CoordinatorLogin />} />
        <Route path="/adminLogin" element={<Login />} />
        <Route path="/admin-register" element={<AdminRegister />} />
        <Route path="forgot-password" element={<ForgotPassword />} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="plumbers" element={<Plumbers />} />
          <Route path="coordinator-plumbers" element={<CoordinatorPlumber />} />
          <Route path="coordinators" element={<CoOrdinators />} />
          <Route path="kycs" element={<KYCs />} />
          <Route path="admin-installations" element={<Installations />} />
          <Route path="installations" element={<InstallationForCoord />} />
          <Route path="orders" element={<CoordOrders />} />
          <Route path="admin-orders" element={<Orders />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
