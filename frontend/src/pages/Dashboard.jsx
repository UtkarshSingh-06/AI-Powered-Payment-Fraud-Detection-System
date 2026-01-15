import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, 
  AlertTriangle, 
  Shield, 
  DollarSign,
  Activity,
  CheckCircle,
  XCircle
} from 'lucide-react';
import './Dashboard.css';

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadDashboardData();
    loadRecentTransactions();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData();
      loadRecentTransactions();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentTransactions = async () => {
    try {
      const response = await api.get('/transactions?limit=10');
      setRecentTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const summary = dashboardData?.summary || {};

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.name}! Here's your payment fraud overview.</p>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-primary">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Transactions</p>
            <p className="stat-value">{summary.total || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-success">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Safe Transactions</p>
            <p className="stat-value">{summary.safe || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-warning">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Suspicious</p>
            <p className="stat-value">{summary.suspicious || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-danger">
            <XCircle size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Fraudulent</p>
            <p className="stat-value">{summary.fraudulent || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-info">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Fraud Rate</p>
            <p className="stat-value">{summary.fraudRate || 0}%</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <h2 className="card-title">Recent Transactions</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Merchant</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Risk Score</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                    No transactions found
                  </td>
                </tr>
              ) : (
                recentTransactions.map((transaction) => (
                  <tr key={transaction.transactionId}>
                    <td>
                      <code className="transaction-id">
                        {transaction.transactionId.substring(0, 12)}...
                      </code>
                    </td>
                    <td>{transaction.merchantName}</td>
                    <td>${transaction.amount.toFixed(2)}</td>
                    <td>
                      <span className={`badge badge-${transaction.status}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${transaction.fraudStatus?.classification?.toLowerCase()}`}>
                        {transaction.fraudStatus?.score?.toFixed(1) || 'N/A'}
                      </span>
                    </td>
                    <td>{new Date(transaction.timestamp).toLocaleDateString()}</td>
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

export default Dashboard;
