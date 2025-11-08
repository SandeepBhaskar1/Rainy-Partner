import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStats } from '../../redux/statsSlice';
import { Loader } from 'lucide-react';
import Stats from './Stats/Stats';
import axios from 'axios';
import TodayRevenue from './totalRevenue';
import RevenueGraph from './RevenueGraph';
import KYCPieChart from './PieChart';
import InstallationQueue from './InstallationQueue/InstallationQueue';
import './Home.css';
import api from '../../api/axiosInstence';

const Home = () => {
  const dispatch = useDispatch();
  const { loading, hasFetched } = useSelector((state) => state.stats);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  useEffect(() => {
    if (!hasFetched) {
      dispatch(fetchStats());
    }
  }, [dispatch, hasFetched]);

  useEffect(() => {
    if (!loading && hasFetched) {
      setIsInitialLoad(false);
    }
  }, [loading, hasFetched]);

  if (isInitialLoad && loading) {
    return (
      <div className="home-loading-container">
        <Loader size={48} className="spinner-icon" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="middle-column">
        <Stats />
        <TodayRevenue />
        <KYCPieChart />
        <InstallationQueue />
      </div>

      <div className="right-column">
        <RevenueGraph />
      </div>
    </div>
  );
};

export default Home;