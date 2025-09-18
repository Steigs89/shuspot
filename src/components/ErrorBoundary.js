import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Could not open book</h2>
          <p style={{ color: '#666' }}>An error occurred while launching this book.</p>
          <pre style={{ background: '#f8f8f8', padding: 12, borderRadius: 6, overflow: 'auto' }}>
            {String(this.state.error)}
          </pre>
          {this.props.fallback}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
