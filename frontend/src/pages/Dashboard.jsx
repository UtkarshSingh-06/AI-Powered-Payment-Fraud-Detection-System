import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import BlurText from '../components/BlurText';
import { 
  TrendingUp, 
  AlertTriangle, 
  Shield, 
  DollarSign,
  Activity,
  CheckCircle,
  XCircle,
  Zap,
  Eye
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
      <div className="dashboard-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
      
      <div className="dashboard-header">
        <div className="header-content">
          <BlurText 
            text="Dashboard"
            className="dashboard-title"
            delay={100}
            animateBy="words"
            direction="top"
            stepDuration={0.4}
            animationFrom={{ filter: 'blur(15px)', opacity: 0, y: -30 }}
            animationTo={[
              { filter: 'blur(8px)', opacity: 0.6, y: 5 },
              { filter: 'blur(0px)', opacity: 1, y: 0 }
            ]}
          />
          <p className="dashboard-subtitle">
            Welcome back, <span className="highlight-name">{user?.name}</span>! Here's your payment fraud overview.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card glass-card">
          <div className="card-glow"></div>
          <div className="stat-icon stat-primary">
            <DollarSign size={28} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Transactions</p>
            <p className="stat-value">{summary.total || 0}</p>
            <div className="stat-trend">
              <Activity size={14} />
              <span>All time</span>
            </div>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="card-glow glow-success"></div>
          <div className="stat-icon stat-success">
            <CheckCircle size={28} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Safe Transactions</p>
            <p className="stat-value">{summary.safe || 0}</p>
            <div className="stat-trend">
              <Shield size={14} />
              <span>Verified</span>
            </div>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="card-glow glow-warning"></div>
          <div className="stat-icon stat-warning">
            <AlertTriangle size={28} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Suspicious</p>
            <p className="stat-value">{summary.suspicious || 0}</p>
            <div className="stat-trend">
              <Eye size={14} />
              <span>Under review</span>
            </div>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="card-glow glow-danger"></div>
          <div className="stat-icon stat-danger">
            <XCircle size={28} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Fraudulent</p>
            <p className="stat-value">{summary.fraudulent || 0}</p>
            <div className="stat-trend">
              <Zap size={14} />
              <span>Blocked</span>
            </div>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="card-glow glow-info"></div>
          <div className="stat-icon stat-info">
            <TrendingUp size={28} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Fraud Rate</p>
            <p className="stat-value">{summary.fraudRate || 0}%</p>
            <div className="stat-trend">
              <TrendingUp size={14} />
              <span>Real-time</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card glass-card transactions-card">
        <div className="card-header">
          <h2 className="card-title">Recent Transactions</h2>
          <div className="card-header-accent"></div>
        </div>
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
