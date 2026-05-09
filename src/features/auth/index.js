import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { signInWithEmailPassword, signUpWithEmail } from "./useAuth";

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
  const [authTab, setAuthTab] = useState("email");
  const [emailMode, setEmailMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);

  useEffect(() => {
    if (!open) {
      setAuthTab("email");
      setEmailMode("login");
      setEmail("");
      setPassword("");
      setEmailError("");
      setEmailSuccess("");
      setForgotSending(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleEmailSubmit(event) {
    event.preventDefault();
    setEmailError("");
    setEmailSuccess("");
    const e = email.trim();
    if (!e || !password) {
      setEmailError("Enter email and password.");
      return;
    }
    setEmailSubmitting(true);
    try {
      if (emailMode === "login") {
        const { error } = await signInWithEmailPassword(e, password);
        if (error) {
          setEmailError(error.message || "Could not sign in.");
          return;
        }
        onClose();
      } else {
        const { data, error } = await signUpWithEmail(e, password);
        if (error) {
          setEmailError(error.message || "Could not create account.");
          return;
        }
        if (data?.session) {
          onClose();
        } else {
          setEmailSuccess("Check your inbox to confirm your email, then sign in.");
        }
      }
    } finally {
      setEmailSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    const entered = window.prompt("Enter the email address for your account:", email.trim());
    if (entered === null) return;
    const addr = entered.trim();
    if (!addr) {
      setEmailError("Enter a valid email.");
      setEmailSuccess("");
      return;
    }
    setEmailError("");
    setEmailSuccess("");
    setForgotSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(addr, {
        redirectTo: window.location.origin,
      });
      if (error) {
        setEmailError(error.message || "Could not send reset email.");
        return;
      }
      setEmailSuccess("Reset link sent to your email!");
    } finally {
      setForgotSending(false);
    }
  }

  const tabBtn = (id, label) => (
    <button
      key={id}
      type="button"
      onClick={() => {
        setAuthTab(id);
        setEmailError("");
        setEmailSuccess("");
      }}
      style={{
        flex: 1,
        border: "none",
        borderRadius: 12,
        padding: "10px 12px",
        fontWeight: 700,
        cursor: "pointer",
        background: authTab === id ? "var(--color-primary)" : "transparent",
        color: authTab === id ? "#FFFFFF" : "var(--color-muted)",
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="slide-up"
        style={{
          width: "100%",
          maxWidth: 480,
          borderRadius: 20,
          background: "#FFFFFF",
          padding: 16,
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
            gap: 6,
            padding: 4,
            marginBottom: 16,
            borderRadius: 14,
            background: "#F3F4F6",
          }}
        >
          {tabBtn("email", "Email")}
          {tabBtn("google", "Google")}
        </div>

        {authTab === "email" ? (
          <form onSubmit={handleEmailSubmit}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--color-text)" }}>
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="you@example.com"
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginBottom: 12,
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid var(--color-border)",
                fontSize: 15,
              }}
            />
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--color-text)" }}>
              Password
            </label>
            <input
              type="password"
              autoComplete={emailMode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginBottom: 12,
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid var(--color-border)",
                fontSize: 15,
              }}
            />
            {emailMode === "login" ? (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={forgotSending || emailSubmitting}
                  style={{
                    border: "none",
                    background: "none",
                    color: "var(--color-primary)",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: forgotSending || emailSubmitting ? "default" : "pointer",
                    padding: 0,
                    opacity: forgotSending || emailSubmitting ? 0.7 : 1,
                  }}
                >
                  {forgotSending ? "Sending…" : "Forgot Password?"}
                </button>
              </div>
            ) : null}
            {emailError ? (
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#DC2626" }}>{emailError}</p>
            ) : null}
            {emailSuccess ? (
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#059669" }}>{emailSuccess}</p>
            ) : null}
            <button
              type="submit"
              disabled={emailSubmitting}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "none",
                background: "var(--color-primary)",
                color: "#FFFFFF",
                padding: "12px 14px",
                fontWeight: 700,
                cursor: emailSubmitting ? "default" : "pointer",
                opacity: emailSubmitting ? 0.75 : 1,
                marginBottom: 12,
              }}
            >
              {emailSubmitting ? "Please wait…" : emailMode === "login" ? "Log in" : "Sign up"}
            </button>
            <p style={{ margin: 0, textAlign: "center", fontSize: 14, color: "var(--color-muted)" }}>
              {emailMode === "login" ? (
                <>
                  New here?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setEmailMode("signup");
                      setEmailError("");
                      setEmailSuccess("");
                    }}
                    style={{
                      border: "none",
                      background: "none",
                      color: "var(--color-primary)",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                      fontSize: 14,
                    }}
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setEmailMode("login");
                      setEmailError("");
                      setEmailSuccess("");
                    }}
                    style={{
                      border: "none",
                      background: "none",
                      color: "var(--color-primary)",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                      fontSize: 14,
                    }}
                  >
                    Log in
                  </button>
                </>
              )}
            </p>
          </form>
        ) : (
          <>
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
            <p style={{ margin: "12px 0 0", textAlign: "center", fontSize: 12, color: "var(--color-muted)", lineHeight: 1.45 }}>
              Note: If Google login gets stuck, please use Email login instead.
            </p>
          </>
        )}

        <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: 11, color: "var(--color-muted)" }}>
          By continuing you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}

export default AuthModal;
