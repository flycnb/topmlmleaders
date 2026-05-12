import React from "react";

const section = { marginBottom: 22 };
const h2 = { fontSize: 17, fontWeight: 800, color: "var(--color-text)", margin: "0 0 10px" };
const p = { margin: 0, fontSize: 15, lineHeight: 1.65, color: "var(--color-text)" };
const ul = { margin: "8px 0 0", paddingLeft: 20, color: "var(--color-text)", fontSize: 15, lineHeight: 1.65 };

export default function Terms() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        padding: "16px max(16px, env(safe-area-inset-right)) 32px max(16px, env(safe-area-inset-left))",
        maxWidth: 640,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <button
        type="button"
        onClick={() => window.history.back()}
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: 999,
          background: "#FFFFFF",
          padding: "8px 14px",
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: 20,
          fontSize: 14,
        }}
      >
        ← Back
      </button>

      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 8px", color: "var(--color-text)" }}>Terms &amp; Conditions</h1>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--color-muted)" }}>Last updated: May 2026</p>

      <section style={section}>
        <p style={p}>By using TopMLMLeaders.com you agree to these terms.</p>
      </section>

      <section style={section}>
        <h2 style={h2}>Use of Platform</h2>
        <ul style={ul}>
          <li>You must provide accurate profile information</li>
          <li>You must not spam, harass, or misuse the platform</li>
          <li>You must be 18 years or older to register</li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={h2}>Member Profiles</h2>
        <ul style={ul}>
          <li>You own your profile content</li>
          <li>You grant TopMLMLeaders.com license to display it</li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={h2}>Payments</h2>
        <ul style={ul}>
          <li>Subscription fees are non-refundable after 7 days</li>
          <li>Plans auto-renew unless cancelled</li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={h2}>Termination</h2>
        <p style={p}>We reserve the right to suspend accounts that violate these terms.</p>
      </section>

      <section style={section}>
        <h2 style={h2}>Contact</h2>
        <p style={p}>
          <a href="mailto:digidreamltd@gmail.com" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
            digidreamltd@gmail.com
          </a>
        </p>
      </section>
    </main>
  );
}
