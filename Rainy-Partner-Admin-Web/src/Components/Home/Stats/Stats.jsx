import React from 'react';
import { useSelector } from 'react-redux';
import { Users, ClipboardList, Truck, MapPin, ClipboardCheck } from 'lucide-react';
import './Stats.css';

const Stats = () => {
  const { plumbers, orders, leads, error } = useSelector(
    (state) => state.stats
  );

  if (error) return <p>Error: {error}</p>;

  const statsData = [
    {
      title: 'Active Plumbers',
      value: plumbers?.approved ?? 0,
      icon: <Users className="icon users" />
    },
    {
      title: 'Pending KYCs',
      value: plumbers?.pending ?? 0,
      icon: <ClipboardCheck className="icon kyc" />
    },
    {
      title: 'Total Orders',
      value: orders?.total ?? 0,
      icon: <ClipboardList className="icon orders" />
    },
    {
      title: 'Awaiting Dispatch',
      value: orders?.awaitingDispatch ?? 0,
      icon: <Truck className="icon dispatch" />
    },
    {
      title: 'Open Installations',
      value: leads?.openInstallations ?? 0,
      icon: <MapPin className="icon installations" />
    }
  ];

  return (
    <div className="stats-container">
      {statsData.map((stat, index) => (
        <div key={index} className="stat-card">
          <div className="icon-wrapper">{stat.icon}</div>
          <div className="stat-info">
            <h4>{stat.title}</h4>
            <p>{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Stats;