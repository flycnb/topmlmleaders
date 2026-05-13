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
        <p style={{ ...p, marginTop: 12 }}>
          TopMLMLeaders.com is owned and operated by Digi Dream (Proprietorship), Mumbai, India. Brand name: TopMLMLeaders. Contact: digidreamltd@gmail.com
        </p>
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
        <h2 style={h2}>Payments & Subscriptions</h2>
        <ul style={ul}>
          <li>All payments are processed securely via Razorpay</li>
          <li>Plans are available monthly and yearly</li>
          <li>
            Pricing:
            <ul style={{ marginTop: 6, paddingLeft: 20, color: "var(--color-text)", fontSize: 15, lineHeight: 1.65 }}>
              <li>Pro — ₹1,499/year or ₹149/month</li>
              <li>Elite — ₹3,999/year or ₹399/month</li>
              <li>Company — ₹7,999/year or ₹799/month</li>
            </ul>
          </li>
          <li>Plans auto-renew unless cancelled before renewal date</li>
          <li>You can cancel anytime from your dashboard settings</li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={h2}>Refund Policy</h2>
        <ul style={ul}>
          <li>Refund requests within 7 days of payment will be honoured in full</li>
          <li>No refunds after 7 days of purchase</li>
          <li>To request a refund contact us at digidreamltd@gmail.com with your payment details</li>
          <li>Refunds will be processed within 5-7 business days to original payment method</li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={h2}>Governing Law</h2>
        <p style={p}>
          These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra,
          India.
        </p>
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
