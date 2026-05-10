import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { mapMembers } from "../features/search";

function Avatar({ member }) {
  const url = member.avatarUrl || member.avatar_url;
  const initials = String(member.initials || member.name || "ML").slice(0, 2).toUpperCase();
  const color = member.color || "#6C63FF";
  if (url) {
    return (
      <img
        src={url}
        alt=""
        style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "2px solid #FFFFFF", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
      />
    );
  }
  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: `${color}22`,
        color,
        display: "grid",
        placeItems: "center",
        fontWeight: 800,
        fontSize: 16,
        border: "2px solid #FFFFFF",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      {initials}
    </div>
  );
}

function medalStyle(rank) {
  if (rank === 1) return { border: "3px solid #F59E0B", boxShadow: "0 12px 40px rgba(245,158,11,0.35)", transform: "scale(1.02)" };
  if (rank === 2) return { border: "3px solid #94A3B8", boxShadow: "0 10px 32px rgba(148,163,184,0.35)" };
  if (rank === 3) return { border: "3px solid #D97706", boxShadow: "0 10px 32px rgba(217,119,6,0.28)" };
  return { border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" };
}

export default function Leaderboard({ user, isFollowing, toggleFollow, onOpenProfile, onAuthRequired }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState("");

  useEffect(() => {
    let canceled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("follower_count", { ascending: false, nullsFirst: false })
        .limit(50);
      if (canceled) return;
      if (error || !data?.length) {
        setMembers([]);
      } else {
        setMembers(mapMembers(data));
      }
      setLoading(false);
    }
    load();
    return () => {
      canceled = true;
    };
  }, [user?.id]);

  const countries = useMemo(() => {
    const set = new Set();
    members.forEach((m) => {
      if (m.country) set.add(m.country);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [members]);

  const filtered = useMemo(() => {
    if (!countryFilter) return members;
    return members.filter((m) => m.country === countryFilter);
  }, [members, countryFilter]);

  function handleFollow(member) {
    if (!user?.id) {
      onAuthRequired?.();
      return;
    }
    toggleFollow(member, ({ memberId: id, followerCount }) => {
      setMembers((prev) =>
        prev.map((item) => (item.id === id ? { ...item, followerCount } : item))
      );
    });
  }

  return (
    <div style={{ padding: "16px 16px 32px", maxWidth: 720, margin: "0 auto" }}>
      <header className="fade-in" style={{ marginBottom: 20, textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "var(--color-text)" }}>🏆 Top MLM Leaders</h1>
        <p style={{ margin: "8px 0 0", color: "var(--color-muted)", fontSize: 15 }}>Ranked by followers worldwide</p>
        <div style={{ marginTop: 14 }}>
          <label htmlFor="lb-country" style={{ fontSize: 13, color: "var(--color-muted)", marginRight: 8 }}>
            Country
          </label>
          <select
            id="lb-country"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid var(--color-border)",
              fontFamily: "Inter, sans-serif",
              fontSize: 14,
              minWidth: 200,
              background: "#FFFFFF",
            }}
          >
            <option value="">All Countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </header>

      {loading ? (
        <p style={{ textAlign: "center", color: "var(--color-muted)" }}>Loading leaderboard…</p>
      ) : filtered.length === 0 ? (
        <div
          style={{
            borderRadius: 20,
            background: "#FFFFFF",
            border: "1px solid var(--color-border)",
            padding: 40,
            textAlign: "center",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div style={{ fontSize: 48 }}>🏆</div>
          <h2 style={{ margin: "12px 0 8px" }}>No leaders yet</h2>
          <p style={{ margin: 0, color: "var(--color-muted)" }}>Check back once members join the directory.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {filtered.map((member, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
            const ms = medalStyle(rank);
            const prominent = rank <= 3;
            return (
              <article
                key={member.id}
                className="slide-up"
                style={{
                  background: "#FFFFFF",
                  borderRadius: prominent ? 22 : 18,
                  padding: prominent ? 18 : 14,
                  ...ms,
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div style={{ width: 44, textAlign: "center", fontWeight: 800, fontSize: rank <= 3 ? 28 : 18, color: "var(--color-muted)" }}>
                  {medal || `#${rank}`}
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                  <Avatar member={member} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {member.name}
                      {member.verified ? <span style={{ color: "var(--color-primary)" }}>✓</span> : null}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--color-muted)" }}>
                      {member.role} · {member.company}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>
                      📍 {member.city}
                      {member.country ? `, ${member.country}` : ""}
                    </div>
                    <div style={{ fontSize: 13, marginTop: 6 }}>
                      ⭐ {Number(member.rating || 0).toFixed(1)}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", display: "grid", gap: 8, justifyItems: "end" }}>
                  <div style={{ fontWeight: 800, fontSize: prominent ? 22 : 18, color: member.color || "var(--color-primary)" }}>
                    👤 {(member.followerCount || 0).toLocaleString()}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFollow(member)}
                    style={{
                      borderRadius: 999,
                      border: "1px solid var(--color-border)",
                      background: "#FFFFFF",
                      padding: "6px 12px",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {isFollowing(member.id) ? "Following ✓" : "Follow"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenProfile?.(member)}
                    style={{
                      borderRadius: 999,
                      border: "none",
                      background: "var(--color-primary)",
                      color: "#FFFFFF",
                      padding: "8px 14px",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    View Profile
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
