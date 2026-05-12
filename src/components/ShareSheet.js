import React from "react";

const OPTIONS = [
  { id: "wa", label: "WhatsApp", icon: "💬" },
  { id: "li", label: "LinkedIn", icon: "💼" },
  { id: "fb", label: "Facebook", icon: "📘" },
  { id: "x", label: "Twitter/X", icon: "🐦" },
  { id: "copy", label: "Copy Link", icon: "📋" },
  { id: "email", label: "Email", icon: "✉️" },
];

function ShareSheet({ open, onClose, member }) {
  if (!open || !member) return null;

  const profileUrl = `https://topmlmleaders.com/u/${member.slug || member.id || ""}`;
  const encodedUrl = encodeURIComponent(profileUrl);
  const message = `Check out ${member.name}'s MLM profile!\n${member.role} | ${member.company} | ${member.city}\n⭐${member.rating || 0} | 👥${member.teamSize || "-"} | 💰${member.earnings || "-"}\n${profileUrl}`;
  const encodedMessage = encodeURIComponent(message);

  async function handleAction(type) {
    if (type === "wa") window.open(`https://wa.me/?text=${encodedMessage}`, "_blank", "noopener");
    if (type === "li") window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, "_blank", "noopener");
    if (type === "fb") window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "_blank", "noopener");
    if (type === "x") window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedMessage}`, "_blank", "noopener");
    if (type === "email") window.open(`mailto:?subject=${encodeURIComponent("MLM Leader Profile")}&body=${encodedMessage}`, "_self");
    if (type === "copy" && navigator.clipboard) await navigator.clipboard.writeText(profileUrl);
    onClose();
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(17,24,39,0.5)", display: "flex", alignItems: "flex-end" }}>
      <div onClick={(event) => event.stopPropagation()} className="slide-up" style={{ width: "100%", background: "#FFFFFF", borderRadius: "20px 20px 0 0", padding: "20px 16px calc(16px + var(--safe-bottom))" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-primary)", color: "#FFFFFF", display: "grid", placeItems: "center", fontWeight: 800 }}>
            {String(member.initials || "ML").slice(0, 2)}
          </div>
          <div>
            <div style={{ fontWeight: 800 }}>{member.name}</div>
            <div style={{ fontSize: 12, color: "var(--color-muted)" }}>{member.role}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          {OPTIONS.map((option) => (
            <button key={option.id} type="button" onClick={() => handleAction(option.id)} style={{ border: "1px solid var(--color-border)", background: "#FFFFFF", borderRadius: 12, padding: "10px 8px", cursor: "pointer" }}>
              <div style={{ fontSize: 20 }}>{option.icon}</div>
              <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700 }}>{option.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ShareSheet;
