import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Shield, CheckCircle, XCircle, Eye } from 'lucide-react';
import './AdminPanel.css';

function AdminPanel() {
  const [fraudCases, setFraudCases] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFraudCases();
  }, []);

  const loadFraudCases = async () => {
    try {
      const response = await api.get('/admin/fraud-cases');
      setFraudCases(response.data.fraudCases || []);
    } catch (error) {
      console.error('Error loading fraud cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (transactionId) => {
    try {
      await api.post(`/admin/transactions/${transactionId}/approve`, {
        adminNotes: adminNotes || 'Approved by admin'
      });
      setAdminNotes('');
      setSelectedTransaction(null);
      loadFraudCases();
      alert('Transaction approved successfully');
    } catch (error) {
      console.error('Error approving transaction:', error);
      alert(error.response?.data?.message || 'Failed to approve transaction');
    }
  };

  const handleBlock = async (transactionId) => {
    try {
      await api.post(`/admin/transactions/${transactionId}/block`, {
        adminNotes: adminNotes || 'Blocked by admin'
      });
      setAdminNotes('');
      setSelectedTransaction(null);
      loadFraudCases();
      alert('Transaction blocked successfully');
    } catch (error) {
      console.error('Error blocking transaction:', error);
      alert(error.response?.data?.message || 'Failed to block transaction');
    }
  };

  if (loading) {
    return <div className="loading">Loading fraud cases...</div>;
  }

  return (
    <div className="admin-panel">
      <div className="page-header">
        <div>
          <h1>Admin Panel</h1>
          <p>Investigate and manage flagged fraud cases</p>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Fraud Cases</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>User ID</th>
                <th>Merchant</th>
                <th>Amount</th>
                <th>Risk Score</th>
                <th>Classification</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fraudCases.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                    No fraud cases found
                  </td>
                </tr>
              ) : (
                fraudCases.map((transaction) => (
                  <tr key={transaction.transactionId}>
                    <td>
                      <code className="transaction-id">
                        {transaction.transactionId.substring(0, 12)}...
                      </code>
                    </td>
                    <td>{transaction.userId}</td>
                    <td>{transaction.merchantName}</td>
                    <td>${transaction.amount.toFixed(2)}</td>
                    <td>{transaction.fraudStatus?.score?.toFixed(1) || 'N/A'}</td>
                    <td>
                      <span className={`badge badge-${transaction.fraudStatus?.classification?.toLowerCase()}`}>
                        {transaction.fraudStatus?.classification || 'Safe'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${transaction.status}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td>{new Date(transaction.timestamp).toLocaleString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          onClick={() => setSelectedTransaction(transaction)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="btn-icon btn-success"
                          onClick={() => handleApprove(transaction.transactionId)}
                          title="Approve"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => handleBlock(transaction.transactionId)}
                          title="Block"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTransaction && (
        <div className="modal-overlay" onClick={() => setSelectedTransaction(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Transaction Details</h2>
              <button
                className="btn-icon"
                onClick={() => setSelectedTransaction(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <strong>Transaction ID:</strong>
                <span>{selectedTransaction.transactionId}</span>
              </div>
              <div className="detail-row">
                <strong>User ID:</strong>
                <span>{selectedTransaction.userId}</span>
              </div>
              <div className="detail-row">
                <strong>Merchant:</strong>
                <span>{selectedTransaction.merchantName}</span>
              </div>
              <div className="detail-row">
                <strong>Amount:</strong>
                <span>${selectedTransaction.amount.toFixed(2)}</span>
              </div>
              <div className="detail-row">
                <strong>Risk Score:</strong>
                <span>{selectedTransaction.fraudStatus?.score?.toFixed(1)}</span>
              </div>
              <div className="detail-row">
                <strong>Classification:</strong>
                <span className={`badge badge-${selectedTransaction.fraudStatus?.classification?.toLowerCase()}`}>
                  {selectedTransaction.fraudStatus?.classification}
                </span>
              </div>
              <div className="detail-row">
                <strong>Reasons:</strong>
                <ul>
                  {selectedTransaction.fraudStatus?.reasons?.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </div>
              <div className="form-group">
                <label className="form-label">Admin Notes</label>
                <textarea
                  className="form-input"
                  rows="4"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes for this transaction..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedTransaction(null)}
              >
                Close
              </button>
              <button
                className="btn btn-success"
                onClick={() => handleApprove(selectedTransaction.transactionId)}
              >
                Approve
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleBlock(selectedTransaction.transactionId)}
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
