import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const REASONS = [
  "Fake Profile",
  "Spam or Misleading",
  "Inappropriate Content",
  "Misleading Income Claims",
  "Harassment",
  "Other",
];

function FlagModal({ open, onClose, user, member, onAuthRequired }) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open || !member) return null;

  async function submitFlag(event) {
    event.preventDefault();
    if (!user?.id) {
      onAuthRequired?.();
      return;
    }
    if (!reason) {
      setStatus("Please select a reason.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("flags").insert({
      reporter_id: user.id,
      member_id: member.id,
      reason,
      description,
      created_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      setStatus("Could not submit report. Please try again.");
      return;
    }
    setStatus("✅ Report submitted. We'll review it shortly.");
    setTimeout(() => {
      onClose();
      setReason("");
      setDescription("");
      setStatus("");
    }, 2000);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 220,
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
        }}
      >
        <div
          style={{
            width: 44,
            height: 5,
            borderRadius: 999,
            background: "#D1D5DB",
            margin: "0 auto 14px",
          }}
        />
        <h3 style={{ margin: "0 0 4px" }}>🚩 Report Member</h3>
        <p style={{ margin: "0 0 12px", color: "var(--color-muted)" }}>
          Help us keep the community safe
        </p>
        <p style={{ margin: "0 0 12px", fontWeight: 600 }}>Reporting: {member.name}</p>
        <form onSubmit={submitFlag} style={{ display: "grid", gap: 10 }}>
          <select
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: "10px 12px",
              fontFamily: "Inter, sans-serif",
            }}
          >
            <option value="">Select a reason...</option>
            {REASONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value.slice(0, 500))}
            placeholder="Additional details (optional)..."
            rows={4}
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: "10px 12px",
              fontFamily: "Inter, sans-serif",
            }}
          />
          <div style={{ fontSize: 12, color: "var(--color-muted)", textAlign: "right" }}>
            {description.length}/500
          </div>
          <button
            type="submit"
            disabled={saving}
            style={{
              border: "none",
              borderRadius: 12,
              background: "var(--color-danger)",
              color: "#FFFFFF",
              padding: "12px 14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {saving ? "Submitting..." : "Submit Report"}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              background: "#FFFFFF",
              color: "var(--color-text)",
              padding: "10px 12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          {status ? <p style={{ margin: 0, color: "var(--color-muted)" }}>{status}</p> : null}
        </form>
      </div>
    </div>
  );
}

export default FlagModal;

