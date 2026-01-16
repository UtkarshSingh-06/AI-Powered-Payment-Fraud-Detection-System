import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import About from './pages/About';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import Recommendations from './pages/Recommendations';
import AdminPanel from './pages/AdminPanel';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/" />;
  }
  
  if (user.role !== 'admin') {
    return <Navigate to="/app/dashboard" />;
  }
  
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  
  return (
    <Routes>
      {/* Landing/Home Page - Show About page for non-authenticated users */}
      <Route 
        path="/" 
        element={!user ? <About /> : <Navigate to="/app/dashboard" />} 
      />
      <Route path="/about" element={<About />} />
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/app/dashboard" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/app/dashboard" />} />
      {/* Protected Routes */}
      <Route
        path="/app"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />
      </Route>
      {/* Redirect old dashboard route */}
      <Route path="/dashboard" element={<Navigate to="/app/dashboard" />} />
      <Route path="/transactions" element={<Navigate to="/app/transactions" />} />
      <Route path="/analytics" element={<Navigate to="/app/analytics" />} />
      <Route path="/recommendations" element={<Navigate to="/app/recommendations" />} />
      <Route path="/admin" element={<Navigate to="/app/admin" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
