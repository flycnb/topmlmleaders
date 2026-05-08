import React from "react";
import Avatar from "./Avatar";

function Star({ filled }) {
  return <span style={{ color: filled ? "#F59E0B" : "#D1D5DB", fontSize: 14 }}>★</span>;
}

function planBadge(plan) {
  if (plan === "elite") return "🌟 Elite";
  if (plan === "pro") return "💎 Pro";
  return null;
}

function MemberCard({
  member,
  isLoggedIn,
  isFollowing,
  onFollow,
  onBlockedAction,
  onViewProfile,
}) {
  const badge = planBadge(member.plan);
  const canOpenWa = member.waVisibility === "public" || isLoggedIn;
  const slots = Number(member.slots || 0);

  const openWhatsapp = () => {
    if (!canOpenWa) {
      onBlockedAction("Login to contact this leader on WhatsApp.");
      return;
    }
    if (!member.wa) return;
    window.open(`https://wa.me/${String(member.wa).replace(/[^\d]/g, "")}`, "_blank", "noopener");
  };

  return (
    <article
      className="fade-in"
      style={{
        background: "var(--color-card)",
        borderRadius: "var(--radius-card)",
        boxShadow: "0 8px 32px rgba(108,99,255,0.1)",
        border: "1px solid var(--color-border)",
        overflow: "hidden",
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          height: 60,
          padding: 10,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: `linear-gradient(135deg, ${member.color || "#6C63FF"}, #4338ca)`,
        }}
      >
        <div>
          {member.plan === "elite" && slots > 0 ? (
            <span
              style={{
                background: "#10B981",
                color: "#FFFFFF",
                borderRadius: 999,
                fontSize: 11,
                padding: "4px 8px",
                fontWeight: 700,
              }}
            >
              📅 {slots} slots
            </span>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {badge ? (
            <span style={{ background: "rgba(255,255,255,0.2)", color: "#FFFFFF", borderRadius: 999, fontSize: 11, padding: "4px 8px", fontWeight: 700 }}>
              {badge}
            </span>
          ) : null}
          {member.verified ? (
            <span style={{ background: "rgba(255,255,255,0.2)", color: "#FFFFFF", borderRadius: 999, fontSize: 11, padding: "4px 8px", fontWeight: 700 }}>
              ✓ Verified
            </span>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: -28, padding: "0 14px 14px" }}>
        <Avatar avatarUrl={member.avatarUrl} initials={member.initials} color={member.color} size={56} />
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{member.name}</h3>
            {member.verified ? <span style={{ color: "var(--color-primary)" }}>✔</span> : null}
          </div>
          <p style={{ margin: "4px 0", color: "var(--color-muted)", fontSize: 13 }}>
            {member.role} · {member.company}
          </p>
          <p style={{ margin: 0, color: "#9CA3AF", fontSize: 12 }}>
            📍 {member.city}, {member.country} · {member.yearsExp || 0} yrs exp
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 8 }}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Star key={value} filled={value <= Math.round(member.rating || 0)} />
            ))}
            <span style={{ fontSize: 12, color: "var(--color-muted)", marginLeft: 6 }}>
              ({member.reviews || 0})
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <span style={{ fontSize: 13, color: "var(--color-text)" }}>👤 {member.followerCount.toLocaleString()} followers</span>
            <button
              type="button"
              onClick={() => onFollow(member.id)}
              style={{
                borderRadius: 999,
                padding: "7px 14px",
                fontWeight: 700,
                border: isFollowing ? "1px solid var(--color-primary)" : "none",
                background: isFollowing ? "#FFFFFF" : "var(--color-primary)",
                color: isFollowing ? "var(--color-primary)" : "#FFFFFF",
                cursor: "pointer",
              }}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--color-border)", marginTop: 10, paddingTop: 10 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <button
              type="button"
              onClick={openWhatsapp}
              style={{ flex: 1, borderRadius: 12, border: "1px solid #D1FAE5", background: "#ECFDF5", color: "#10B981", fontWeight: 700, padding: "9px 8px", cursor: "pointer" }}
            >
              💬 WA
            </button>
            <button
              type="button"
              onClick={() => (isLoggedIn ? null : onBlockedAction("Login to start chat."))}
              style={{ flex: 1, borderRadius: 12, border: "1px solid #DBEAFE", background: "#EFF6FF", color: "#2563EB", fontWeight: 700, padding: "9px 8px", cursor: "pointer" }}
            >
              ✉️ Chat
            </button>
          </div>
          <button
            type="button"
            onClick={() => onViewProfile(member)}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 12,
              padding: "11px 14px",
              color: "#FFFFFF",
              fontWeight: 800,
              cursor: "pointer",
              background: `linear-gradient(135deg, ${member.color || "#6C63FF"}, #4338ca)`,
            }}
          >
            {member.plan === "elite" && slots > 0 ? "📅 Book · View Profile →" : "View Profile →"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default MemberCard;
