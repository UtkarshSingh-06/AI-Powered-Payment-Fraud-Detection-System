import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: '#f8fafc', background: '#0a0f0a', minHeight: '100vh' }}>
          <h1 style={{ color: '#ef4444', marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ marginBottom: 16, opacity: 0.8 }}>{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#22c55e',
              color: '#000',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
