import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  CreditCard, 
  BarChart3, 
  Lightbulb, 
  Shield, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import './Layout.css';

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const handler = () => setSidebarOpen(false);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const navItems = [
    { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/transactions', icon: CreditCard, label: 'Transactions' },
    { to: '/app/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/app/recommendations', icon: Lightbulb, label: 'Recommendations' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ to: '/app/admin', icon: Shield, label: 'Admin Panel' });
  }

  return (
    <div className="layout">
      <button
        type="button"
        className="layout-mobile-toggle"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>

      <AnimatePresence>
        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <nav className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
          <Link to="/app/dashboard" className="sidebar-brand" onClick={() => setSidebarOpen(false)}>
            <span className="sidebar-logo-text">FraudShield AI</span>
            <span className="sidebar-tagline">AI fraud payment detector</span>
          </Link>
          <div className="sidebar-user">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{user?.role === 'admin' ? 'Administrator' : 'User'}</span>
          </div>
        </div>

        <ul className="nav-menu">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <Link 
                to={to} 
                className={isActive(to) ? 'active' : ''}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={20} />
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          <button type="button" onClick={handleLogout} className="logout-btn">
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
