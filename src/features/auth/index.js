import React from "react";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.653 32.657 29.224 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.962 3.038l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.001 13 24 13c3.059 0 5.842 1.154 7.962 3.038l5.657-5.657C34.046 6.053 29.268 4 24 4c-7.682 0-14.41 4.337-17.694 10.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.198l-6.19-5.238C29.143 35.091 26.695 36 24 36c-5.204 0-9.621-3.329-11.283-7.946l-6.521 5.025C9.439 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.793 2.23-2.231 4.166-4.084 5.564l.003-.002 6.19 5.238C36.971 39.206 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}

function AuthModal({ open, onClose, signInWithGoogle, loading }) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="slide-up"
        style={{
          width: "100%",
          maxWidth: 480,
          borderRadius: "20px 20px 0 0",
          background: "#FFFFFF",
          padding: "16px 16px calc(20px + var(--safe-bottom))",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            border: "none",
            background: "transparent",
            fontSize: 20,
            color: "var(--color-muted)",
            cursor: "pointer",
          }}
        >
          ×
        </button>
        <div
          style={{
            width: 44,
            height: 5,
            borderRadius: 999,
            background: "#D1D5DB",
            margin: "0 auto 14px",
          }}
        />
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "var(--color-primary)", fontWeight: 800, fontSize: 20 }}>
            🌐 TopMLMLeaders
          </div>
          <p style={{ margin: "6px 0 12px", color: "var(--color-muted)", fontSize: 13 }}>
            AI Powered Search · Connect · Grow Worldwide
          </p>
          <h2 style={{ margin: "0 0 6px" }}>Join the MLM Community</h2>
          <p style={{ margin: "0 0 14px", color: "var(--color-muted)" }}>
            Connect with leaders worldwide
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
            color: "var(--color-muted)",
            fontSize: 12,
          }}
        >
          <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
          Continue with
          <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
        </div>
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading}
          style={{
            width: "100%",
            borderRadius: 12,
            border: "1px solid var(--color-border)",
            background: "#FFFFFF",
            boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {loading ? <span className="spinner">⏳</span> : <GoogleIcon />}
          {loading ? "Redirecting..." : "Continue with Google"}
        </button>
        <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: 11, color: "var(--color-muted)" }}>
          By continuing you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}

export default AuthModal;

