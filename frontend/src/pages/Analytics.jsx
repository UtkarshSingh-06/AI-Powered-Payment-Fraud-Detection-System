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

const COLORS = ['#22c55e', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

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
    return (
      <div className="loading">
        <span className="loading-text">Loading analytics...</span>
      </div>
    );
  }

  const summary = analytics?.summary || {};
  const timeSeries = analytics?.timeSeries || [];
  const highRiskRegions = analytics?.highRiskRegions || [];
  const volumeData = analytics?.volumeData || [];
  const paymentMethods = analytics?.paymentMethods || [];

  return (
    <div className="page-wrapper">
      <div className="page-background">
        <div className="gradient-orb orb-1" />
        <div className="gradient-orb orb-2" />
        <div className="gradient-orb orb-3" />
      </div>
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
      <div className="analytics-stats-grid">
        {[
          { label: 'Total Transactions', value: summary.total || 0, color: 'var(--accent)' },
          { label: 'Fraud Rate', value: `${summary.fraudRate || 0}%`, color: 'var(--danger)' },
          { label: 'Fraudulent', value: summary.fraudulent || 0, color: 'var(--danger)' },
          { label: 'Suspicious', value: summary.suspicious || 0, color: 'var(--warning)' },
        ].map((item, i) => (
          <div key={i} className="analytics-stat-card card">
            <p className="stat-label">{item.label}</p>
            <p className="stat-value" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card chart-card">
          <h2 className="card-title">Fraud Rate Over Time</h2>
          <div className="chart-inner">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: 'rgba(13,26,13,0.95)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12 }} labelStyle={{ color: '#f1f5f9' }} />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.8)' }} />
                <Line type="monotone" dataKey="fraudRate" stroke="#ef4444" strokeWidth={2} name="Fraud Rate (%)" dot={{ fill: '#ef4444' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <h2 className="card-title">Transaction Volume</h2>
          <div className="chart-inner">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: 'rgba(13,26,13,0.95)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12 }} />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.8)' }} />
                <Bar dataKey="count" fill="#22c55e" name="Transactions" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <h2 className="card-title">Payment Methods Distribution</h2>
          <div className="chart-inner">
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
                <Tooltip contentStyle={{ background: 'rgba(13,26,13,0.95)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* High-Risk Regions */}
      <div className="card analytics-table-card">
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
