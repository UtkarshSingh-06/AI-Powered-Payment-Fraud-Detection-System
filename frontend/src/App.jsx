import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import Recommendations from './pages/Recommendations';
import AdminPanel from './pages/AdminPanel';
import LiveMonitoring from './pages/LiveMonitoring';
import Cases from './pages/Cases';
import Alerts from './pages/Alerts';
import TransactionDetail from './pages/TransactionDetail';
import ScamShield from './pages/ScamShield';
import ScamShieldIndicator from './pages/ScamShieldIndicator';
import ScamShieldInvestigations from './pages/ScamShieldInvestigations';
import ScamShieldInvestigationDetail from './pages/ScamShieldInvestigationDetail';
import Layout from './components/Layout';
import PageMeta from './components/PageMeta';
import CookieConsent from './components/CookieConsent';
import { SkeletonPage } from './components/Skeleton';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <SkeletonPage title="Loading account" rows={3} />;
  }

  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <SkeletonPage title="Loading admin" rows={3} />;
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/app/dashboard" />;
  }

  return children;
}

function AnalystRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <SkeletonPage title="Loading" rows={2} />;
  if (!user) return <Navigate to="/login" />;
  if (!['admin', 'analyst', 'super_admin'].includes(user.role)) return <Navigate to="/app/dashboard" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      <PageMeta />
      <Routes>
        <Route
          path="/"
          element={!user ? <About /> : <Navigate to="/app/dashboard" />}
        />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/app/dashboard" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/app/dashboard" />} />
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
          <Route path="transactions/:id" element={<TransactionDetail />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="live-monitoring" element={<LiveMonitoring />} />
          <Route path="cases" element={<AnalystRoute><Cases /></AnalystRoute>} />
          <Route path="alerts" element={<AnalystRoute><Alerts /></AnalystRoute>} />
          <Route path="scamshield" element={<AnalystRoute><ScamShield /></AnalystRoute>} />
          <Route path="scamshield/indicators/:id" element={<AnalystRoute><ScamShieldIndicator /></AnalystRoute>} />
          <Route path="scamshield/investigations" element={<AnalystRoute><ScamShieldInvestigations /></AnalystRoute>} />
          <Route path="scamshield/investigations/:id" element={<AnalystRoute><ScamShieldInvestigationDetail /></AnalystRoute>} />
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
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" />} />
        <Route path="/transactions" element={<Navigate to="/app/transactions" />} />
        <Route path="/analytics" element={<Navigate to="/app/analytics" />} />
        <Route path="/live-monitoring" element={<Navigate to="/app/live-monitoring" />} />
        <Route path="/recommendations" element={<Navigate to="/app/recommendations" />} />
        <Route path="/admin" element={<Navigate to="/app/admin" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <CookieConsent />
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
