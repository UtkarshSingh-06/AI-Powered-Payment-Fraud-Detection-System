import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import api from '../services/api';
import { Lightbulb, AlertCircle, Info, CheckCircle } from 'lucide-react';
import './Recommendations.css';

function Recommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const response = await api.get('/recommendations');
      setRecommendations(response.data.recommendations || []);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="icon-high" />;
      case 'medium':
        return <Info className="icon-medium" />;
      default:
        return <CheckCircle className="icon-low" />;
    }
  };

  const getPriorityClass = (priority) => {
    return `priority-${priority}`;
  };

  if (loading) {
    return (
      <div className="loading">
        <span className="loading-text">Loading recommendations...</span>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="page-background">
        <div className="gradient-orb orb-1" />
        <div className="gradient-orb orb-2" />
        <div className="gradient-orb orb-3" />
      </div>
      <div className="page-header">
        <div>
          <h1>Payment Recommendations</h1>
          <p>AI-powered personalized recommendations to improve your payment security</p>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="card empty-card">
          <div className="empty-state">
            <Lightbulb size={48} className="empty-icon" />
            <h3>No recommendations available</h3>
            <p>Start making transactions to receive personalized recommendations.</p>
          </div>
        </div>
      ) : (
        <div className="recommendations-grid">
          {recommendations.map((rec, index) => (
            <motion.div
              key={index}
              className={`recommendation-card ${getPriorityClass(rec.priority || 'low')}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className="recommendation-header">
                <div className="recommendation-icon">
                  {getPriorityIcon(rec.priority)}
                </div>
                <div className="recommendation-meta">
                  <span className={`badge badge-${rec.type}`}>{rec.type}</span>
                  <span className={`badge badge-${rec.priority}`}>{rec.priority}</span>
                </div>
              </div>
              <h3 className="recommendation-title">{rec.title}</h3>
              <p className="recommendation-description">{rec.description}</p>
              <div className="recommendation-explanation">
                <strong>Why?</strong>
                <p>{rec.explanation}</p>
              </div>
              <div className="recommendation-action">
                <strong>Action:</strong>
                <p>{rec.action}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Recommendations;
