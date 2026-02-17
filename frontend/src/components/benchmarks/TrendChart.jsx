import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const TrendChart = ({ data, dataKey, title, color = "#22c55e", height = 350, theme = "dark" }) => {
  const isLight = theme === "light";
  // Format data for Recharts
  const formattedData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
    value: item.value,
    source: item.source_title
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`trend-chart-tooltip ${isLight ? "trend-chart-tooltip--light" : ""}`} style={{
          background: isLight ? 'rgba(250, 248, 244, 0.98)' : 'rgba(13, 20, 36, 0.95)',
          border: isLight ? '1px solid rgba(38, 35, 31, 0.12)' : '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          color: isLight ? 'rgb(38, 35, 31)' : '#f8fafc'
        }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{payload[0].payload.date}</p>
          <p style={{ margin: '4px 0 0 0', color: color }}>
            {dataKey}: {payload[0].value}
          </p>
          {payload[0].payload.source && (
            <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: isLight ? 'rgb(65, 62, 56)' : '#94a3b8' }}>
              Source: {payload[0].payload.source}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="trend-chart" style={{ width: '100%', height }}>
      <h4 className="trend-chart__title" style={{ 
        fontSize: '0.9375rem', 
        fontWeight: 600, 
        marginBottom: '1rem'
      }}>
        {title}
      </h4>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
          <XAxis 
            dataKey="date" 
            stroke="#64748b"
            style={{ fontSize: '0.75rem' }}
          />
          <YAxis 
            stroke="#64748b"
            style={{ fontSize: '0.75rem' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            dot={{ fill: color, r: 4 }}
            activeDot={{ r: 6 }}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;

