import React from "react";

const section = { marginBottom: 22 };
const h2 = { fontSize: 17, fontWeight: 800, color: "var(--color-text)", margin: "0 0 10px" };
const p = { margin: 0, fontSize: 15, lineHeight: 1.65, color: "var(--color-text)" };
const ul = { margin: "8px 0 0", paddingLeft: 20, color: "var(--color-text)", fontSize: 15, lineHeight: 1.65 };

export default function PrivacyPolicy() {
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

      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 8px", color: "var(--color-text)" }}>Privacy Policy</h1>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--color-muted)" }}>Last updated: May 2026</p>

      <section style={section}>
        <p style={p}>
          TopMLMLeaders.com respects your privacy. This policy explains what data we collect and how we use it.
        </p>
      </section>

      <section style={section}>
        <h2 style={h2}>Data We Collect</h2>
        <ul style={ul}>
          <li>Name, email (via Google login)</li>
          <li>Profile info you provide (city, company, role, photo)</li>
          <li>Usage data (pages visited, searches)</li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={h2}>How We Use Your Data</h2>
        <ul style={ul}>
          <li>To create and display your member profile</li>
          <li>To enable search, follow, chat, and booking features</li>
          <li>To send notifications relevant to your activity</li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={h2}>Data Sharing</h2>
        <ul style={ul}>
          <li>We do not sell your data to third parties</li>
          <li>Phone and WhatsApp numbers are shown only per your visibility settings</li>
        </ul>
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
