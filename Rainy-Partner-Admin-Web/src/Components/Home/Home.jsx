import React from 'react';
import Stats from './Stats/Stats';
import TodayRevenue from './totalRevenue';
import RevenueGraph from './RevenueGraph';
import './Home.css';
import KYCPieChart from './PieChart';
import InstallationQueue from './InstallationQueue/InstallationQueue';

const Home = () => {
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
