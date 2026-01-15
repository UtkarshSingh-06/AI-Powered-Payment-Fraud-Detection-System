import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Filter } from 'lucide-react';
import './Transactions.css';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ status: '', limit: 50 });
  const [formData, setFormData] = useState({
    amount: '',
    merchantName: '',
    merchantCategory: '',
    paymentMethod: 'Credit Card',
    location: '',
    country: 'USA'
  });

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.limit) params.append('limit', filters.limit);
      
      const response = await api.get(`/transactions?${params.toString()}`);
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/transactions', formData);
      setShowForm(false);
      setFormData({
        amount: '',
        merchantName: '',
        merchantCategory: '',
        paymentMethod: 'Credit Card',
        location: '',
        country: 'USA'
      });
      loadTransactions();
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert(error.response?.data?.message || 'Failed to create transaction');
    }
  };

  const getStatusBadgeClass = (status) => {
    return `badge badge-${status}`;
  };

  const getClassificationBadgeClass = (classification) => {
    return `badge badge-${classification?.toLowerCase() || 'safe'}`;
  };

  if (loading) {
    return <div className="loading">Loading transactions...</div>;
  }

  return (
    <div className="transactions-page">
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <p>View and manage your payment transactions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={20} />
          New Transaction
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="card-title">Create New Transaction</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount ($)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  step="0.01"
                  min="0.01"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Merchant Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.merchantName}
                  onChange={(e) => setFormData({ ...formData, merchantName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Merchant Category</label>
                <select
                  className="form-input"
                  value={formData.merchantCategory}
                  onChange={(e) => setFormData({ ...formData, merchantCategory: e.target.value })}
                  required
                >
                  <option value="">Select category</option>
                  <option value="Retail">Retail</option>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Gas Station">Gas Station</option>
                  <option value="Online Shopping">Online Shopping</option>
                  <option value="Travel">Travel</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Gambling">Gambling</option>
                  <option value="Cryptocurrency">Cryptocurrency</option>
                  <option value="Peer-to-Peer">Peer-to-Peer</option>
                  <option value="Grocery">Grocery</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  className="form-input"
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  required
                >
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Digital Wallet">Digital Wallet</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cryptocurrency">Cryptocurrency</option>
                  <option value="Wire Transfer">Wire Transfer</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., New York"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create Transaction
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">All Transactions</h2>
          <div className="filters">
            <select
              className="form-input"
              style={{ width: '200px' }}
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="flagged">Flagged</option>
              <option value="blocked">Blocked</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Merchant</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th>Risk Score</th>
                <th>Classification</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.transactionId}>
                    <td>
                      <code className="transaction-id">
                        {transaction.transactionId.substring(0, 12)}...
                      </code>
                    </td>
                    <td>{transaction.merchantName}</td>
                    <td>{transaction.merchantCategory}</td>
                    <td>${transaction.amount.toFixed(2)}</td>
                    <td>{transaction.paymentMethod}</td>
                    <td>
                      <span className={getStatusBadgeClass(transaction.status)}>
                        {transaction.status}
                      </span>
                    </td>
                    <td>
                      {transaction.fraudStatus?.score?.toFixed(1) || 'N/A'}
                    </td>
                    <td>
                      <span className={getClassificationBadgeClass(transaction.fraudStatus?.classification)}>
                        {transaction.fraudStatus?.classification || 'Safe'}
                      </span>
                    </td>
                    <td>{new Date(transaction.timestamp).toLocaleString()}</td>
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

export default Transactions;
