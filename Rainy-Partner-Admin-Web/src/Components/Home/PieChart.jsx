import { Loader } from 'lucide-react';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const KYCPieChart = () => {
  const { plumbers, loading, error } = useSelector((state) => state.stats);

  const COLORS = {
    approved: '#4f46e5',
    pending: '#06b6d4',
    rejected: '#f59e0b',
  };

  const chartData = useMemo(() => {
    if (!plumbers) return [];

    const data = [
      { name: 'Approved', value: plumbers.approved || 0, status: 'approved' },
      { name: 'Pending', value: plumbers.pending || 0, status: 'pending' },
      { name: 'Rejected', value: plumbers.rejected || 0, status: 'rejected' },
    ].filter(item => item.value > 0);

    return data;
  }, [plumbers]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: 'white',
            padding: '6px 10px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <p style={{ margin: 0, fontWeight: '600', color: '#1f2937' }}>
            {payload[0].name}
          </p>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
            {payload[0].value} plumbers
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: '12px', fontWeight: '600' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '10px 15px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        maxWidth: '150rem',
        margin: '8px 0 8px 20px',
        alignSelf: 'flex-start',
      }}
    >
      <h3
        style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '10px',
          textAlign: 'center',
        }}
      >
        Plumber KYC Status
      </h3>

      {loading ? (
                  <div className="loading-spinner">
              <Loader size={32} className="spinner-icon" />
        </div>
      ) : error ? (
        <p style={{ textAlign: 'center', color: '#ef4444', padding: '20px 0' }}>
          {error}
        </p>
      ) : chartData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px 0' }}>
          No plumbers found
        </p>
      ) : (
        <>
          {/* Reduced chart height */}
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.status]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '18px',
              marginTop: '10px',
              flexWrap: 'wrap',
            }}
          >
            {chartData.map((entry, index) => (
              <div
                key={index}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '2px',
                    backgroundColor: COLORS[entry.status],
                  }}
                ></div>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                  {entry.name}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default KYCPieChart;
