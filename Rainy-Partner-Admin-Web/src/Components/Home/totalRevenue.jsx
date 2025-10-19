import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStats } from '../../redux/statsSlice';
import './Components.css';
import { FaDollarSign } from 'react-icons/fa'; 

const TodayRevenue = () => {
  const dispatch = useDispatch();
  const { orders } = useSelector((state) => state.stats);

  useEffect(() => {
    dispatch(fetchStats());
  }, [dispatch]);

  return (
    <div className="stat-card revenue">
      <div className="icon-wrapper">
        <FaDollarSign className="icon revenue-icon" />
      </div>
      <div className="stat-info">
        <h4>Revenue Today</h4>
        <p>₹ {orders?.todayRevenue?.toLocaleString('en-IN') ?? 0}</p>
      </div>
    </div>
  );
};

export default TodayRevenue;
