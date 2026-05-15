import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("App error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            textAlign: "center",
            background: "#F7F8FC",
          }}
        >
          <div style={{ fontSize: 48 }}>😕</div>
          <h2
            style={{
              marginTop: 16,
              fontSize: 22,
              fontWeight: 800,
              color: "#1A1A2E",
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              color: "#6B7280",
              marginTop: 8,
              fontSize: 15,
            }}
          >
            Please reload the page to continue
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 24,
              border: "none",
              borderRadius: 999,
              background: "#6C63FF",
              color: "#FFFFFF",
              fontWeight: 700,
              padding: "12px 28px",
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
