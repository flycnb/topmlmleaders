import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Contact() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("General");
  const [message, setMessage] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const subParam = searchParams.get("subject");
    if (subParam === "advertise") setSubject("Advertise");
  }, [searchParams]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data?.session?.user;
      if (!user) return;
      setName(user.user_metadata?.name || user.user_metadata?.full_name || "");
      setEmail(user.email || "");
      supabase
        .from("members")
        .select("slug, id")
        .eq("owner_id", user.id)
        .maybeSingle()
        .then(({ data: m }) => {
          if (m?.slug || m?.id) {
            setProfileUrl(`https://topmlmleaders.com/u/${m.slug || m.id}`);
          }
        });
    });
  }, []);

  function handleSend(e) {
    e.preventDefault();
    let body = message;
    if (email?.trim()) {
      body += `\n\nContact email: ${email.trim()}`;
    }
    body += profileUrl ? `\n\nMy TopMLMLeaders Profile:\n${profileUrl}` : "";
    const mailto =
      `mailto:digidreamltd@gmail.com` +
      `?subject=${encodeURIComponent(`[TopMLMLeaders] ${subject} — from ${name}`)}` +
      `&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSent(true);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        padding: "0 0 40px",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "var(--color-primary)",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "#FFFFFF",
            borderRadius: 999,
            padding: "8px 12px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
        <span
          style={{
            color: "#FFFFFF",
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          Contact Us
        </span>
      </div>

      <div style={{ padding: "24px 16px", maxWidth: 500, margin: "0 auto" }}>
        {sent ? (
          <div
            style={{
              background: "#ECFDF5",
              border: "1px solid #10B981",
              borderRadius: 16,
              padding: 24,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 40 }}>✅</div>
            <div
              style={{
                fontWeight: 800,
                fontSize: 18,
                marginTop: 12,
                color: "#065F46",
              }}
            >
              Message Ready!
            </div>
            <div
              style={{
                color: "#047857",
                marginTop: 8,
                fontSize: 14,
              }}
            >
              Your email app should open now. If not, email us at digidreamltd@gmail.com
            </div>
            <button
              type="button"
              onClick={() => navigate("/")}
              style={{
                marginTop: 20,
                border: "none",
                background: "var(--color-primary)",
                color: "#FFFFFF",
                borderRadius: 999,
                padding: "12px 24px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Back to Home
            </button>
          </div>
        ) : (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 20,
              padding: 20,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <p
              style={{
                color: "var(--color-muted)",
                fontSize: 14,
                marginBottom: 20,
              }}
            >
              We'd love to hear from you. Fill in the form and we'll get back to you.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                style={{
                  width: "100%",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 14,
                  fontFamily: "Inter, sans-serif",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{
                  width: "100%",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 14,
                  fontFamily: "Inter, sans-serif",
                  outline: "none",
                  background: "#FFFFFF",
                  boxSizing: "border-box",
                }}
              >
                <option>General</option>
                <option>Advertise</option>
                <option>Support</option>
                <option>Report Issue</option>
                <option>Partnership</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message here..."
                rows={5}
                style={{
                  width: "100%",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 14,
                  fontFamily: "Inter, sans-serif",
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {profileUrl ? (
              <div
                style={{
                  background: "#F0F9FF",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "#0369A1",
                  marginBottom: 20,
                }}
              >
                ✅ Your profile link will be included automatically
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleSend}
              disabled={!name || !message}
              style={{
                width: "100%",
                border: "none",
                borderRadius: 999,
                background: !name || !message ? "#D1D5DB" : "var(--color-primary)",
                color: "#FFFFFF",
                padding: "14px",
                fontWeight: 800,
                fontSize: 16,
                cursor: !name || !message ? "default" : "pointer",
              }}
            >
              ✉️ Send Message
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
