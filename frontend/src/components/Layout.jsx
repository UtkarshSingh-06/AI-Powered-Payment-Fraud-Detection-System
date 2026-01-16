import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  CreditCard, 
  BarChart3, 
  Lightbulb, 
  Shield, 
  LogOut 
} from 'lucide-react';
import './Layout.css';

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h2>FraudShield AI</h2>
            <p className="sidebar-tagline">The AI based fraud payment detector</p>
          </Link>
          <p className="user-name">{user?.name}</p>
          <p className="user-role">{user?.role === 'admin' ? 'Administrator' : 'User'}</p>
        </div>
        
        <ul className="nav-menu">
          <li>
            <Link 
              to="/app/dashboard" 
              className={isActive('/app/dashboard') ? 'active' : ''}
            >
              <LayoutDashboard size={20} />
              Dashboard
            </Link>
          </li>
          <li>
            <Link 
              to="/app/transactions" 
              className={isActive('/app/transactions') ? 'active' : ''}
            >
              <CreditCard size={20} />
              Transactions
            </Link>
          </li>
          <li>
            <Link 
              to="/app/analytics" 
              className={isActive('/app/analytics') ? 'active' : ''}
            >
              <BarChart3 size={20} />
              Analytics
            </Link>
          </li>
          <li>
            <Link 
              to="/app/recommendations" 
              className={isActive('/app/recommendations') ? 'active' : ''}
            >
              <Lightbulb size={20} />
              Recommendations
            </Link>
          </li>
          {user?.role === 'admin' && (
            <li>
              <Link 
                to="/app/admin" 
                className={isActive('/app/admin') ? 'active' : ''}
              >
                <Shield size={20} />
                Admin Panel
              </Link>
            </li>
          )}
        </ul>
        
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
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
