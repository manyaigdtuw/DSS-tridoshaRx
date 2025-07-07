import React, { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Graph Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div className="graph-error">Graph failed to load. Please try again.</div>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;