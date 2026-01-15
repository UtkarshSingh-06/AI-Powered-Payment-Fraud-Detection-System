import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './Analytics.css';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      const response = await api.get(`/analytics/dashboard?${params.toString()}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  const summary = analytics?.summary || {};
  const timeSeries = analytics?.timeSeries || [];
  const highRiskRegions = analytics?.highRiskRegions || [];
  const volumeData = analytics?.volumeData || [];
  const paymentMethods = analytics?.paymentMethods || [];

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1>Analytics Dashboard</h1>
          <p>Payment fraud analytics and insights</p>
        </div>
        <div className="date-filters">
          <input
            type="date"
            className="form-input"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
          />
          <input
            type="date"
            className="form-input"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <p className="stat-label">Total Transactions</p>
            <p className="stat-value">{summary.total || 0}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <p className="stat-label">Fraud Rate</p>
            <p className="stat-value">{summary.fraudRate || 0}%</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <p className="stat-label">Fraudulent</p>
            <p className="stat-value">{summary.fraudulent || 0}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <p className="stat-label">Suspicious</p>
            <p className="stat-value">{summary.suspicious || 0}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card">
          <h2 className="card-title">Fraud Rate Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="fraudRate" stroke="#ef4444" name="Fraud Rate (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="card-title">Transaction Volume</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#4f46e5" name="Transactions" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="card-title">Payment Methods Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentMethods}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ method, percentage }) => `${method}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {paymentMethods.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* High-Risk Regions */}
      <div className="card">
        <h2 className="card-title">High-Risk Regions</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Location</th>
                <th>Total Transactions</th>
                <th>Fraudulent</th>
                <th>Suspicious</th>
                <th>Fraud Rate</th>
              </tr>
            </thead>
            <tbody>
              {highRiskRegions.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                    No data available
                  </td>
                </tr>
              ) : (
                highRiskRegions.map((region, index) => (
                  <tr key={index}>
                    <td>{region.location}</td>
                    <td>{region.total}</td>
                    <td>{region.fraudulent}</td>
                    <td>{region.suspicious}</td>
                    <td>{region.fraudRate}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
