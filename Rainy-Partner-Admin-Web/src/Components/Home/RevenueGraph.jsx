import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const RevenueGraph = () => {
  const { orders, loading, error } = useSelector((state) => state.stats);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (!orders?.data?.length && !orders?.ordersList) return;

    // Use either orders.data or orders.ordersList depending on your backend response
    const orderList = orders.data || orders.ordersList || [];

    const today = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST offset

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(today.getDate() - (6 - i));

      const istDate = new Date(date.getTime() + istOffset);

      const startIST = new Date(
        Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), istDate.getUTCDate(), 0, 0, 0, 0)
      );
      const startUTC = new Date(startIST.getTime() - istOffset);

      const endIST = new Date(
        Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), istDate.getUTCDate(), 23, 59, 59, 999)
      );
      const endUTC = new Date(endIST.getTime() - istOffset);

      return {
        label: istDate.toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        }),
        start: startUTC,
        end: endUTC,
      };
    });

    const data = last7Days.map((day) => {
      const dayOrders = orderList.filter((order) => {
        const orderDate = new Date(order.created_at);
        return orderDate >= day.start && orderDate <= day.end;
      });

      const totalAmount = dayOrders.reduce(
        (sum, o) => sum + (o.total_amount || 0),
        0
      );

      return { date: day.label, Amount: totalAmount };
    });

    setChartData(data);
  }, [orders]);

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "1rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        maxWidth: "600rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "20px",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "20px" }}>₹</span>
        <span
          style={{
            fontSize: "18px",
            fontWeight: "600",
            color: "#1f2937",
          }}
        >
          Order Value — Last 7 Days
        </span>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "#9ca3af" }}>Loading data...</p>
      ) : error ? (
        <p style={{ textAlign: "center", color: "#9ca3af" }}>No data available</p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart
            data={chartData}
            margin={{ right: 30, left: 0, top: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              formatter={(value) => [`₹${value.toLocaleString("en-IN")}`]}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
              }}
            />
            <Line
              type="monotone"
              dataKey="Amount"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{
                r: 4,
                strokeWidth: 2,
                stroke: "#3b82f6",
                fill: "#fff",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          marginTop: "0px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <div
            style={{
              width: "24px",
              height: "2px",
              backgroundColor: "#3b82f6",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                backgroundColor: "#fff",
                border: "2px solid #3b82f6",
                borderRadius: "50%",
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            ></div>
          </div>
        </div>

        <p
          style={{
            textAlign: "center",
            color: "#6b7280",
            fontSize: "14px",
            marginTop: "0",
          }}
        >
          Amount
        </p>
      </div>
    </div>
  );
};

export default RevenueGraph;
