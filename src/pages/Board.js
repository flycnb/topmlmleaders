/**
 * TICKET-010 — Opportunity Board. Requires Supabase table (run in SQL editor):
 *
 * App reads/writes table public.opportunities (PostgREST suggested name vs legacy opportunity_posts).
 * Example DDL — align columns with your Supabase schema:
 * create table if not exists opportunities (
 *   id uuid default gen_random_uuid() primary key,
 *   user_id uuid references auth.users(id),
 *   member_id uuid references members(id),
 *   type text,
 *   title text,
 *   description text,
 *   city text,
 *   country text,
 *   wa text,
 *   active bool default true,
 *   created_at timestamptz default now()
 * );
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const PAGE_SIZE = 20;

const TYPE_OPTIONS = [
  { value: "team", label: "🔍 Looking for Team Members" },
  { value: "training", label: "📚 Training / Workshop" },
  { value: "business", label: "🎯 Business Opportunity" },
  { value: "job", label: "💼 Job / Position" },
  { value: "partnership", label: "🤝 Partnership" },
];

const TYPE_META = {
  team: { label: "Looking for Team", color: "#6C63FF", chip: "Looking for Team" },
  training: { label: "Training", color: "#10B981", chip: "Training" },
  business: { label: "Business", color: "#F59E0B", chip: "Business" },
  job: { label: "Job", color: "#185FA5", chip: "Job" },
  partnership: { label: "Partnership", color: "#D4537E", chip: "Partnership" },
};

const FILTER_CHIPS = [
  { key: "all", label: "All" },
  { key: "team", label: "Looking for Team" },
  { key: "training", label: "Training" },
  { key: "business", label: "Business" },
  { key: "job", label: "Job" },
  { key: "partnership", label: "Partnership" },
];

function timeAgo(iso) {
  const t = new Date(iso).getTime();
  const diffMinutes = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} mins ago`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

function waDigits(wa) {
  return String(wa || "").replace(/[^\d]/g, "");
}

export default function Board({ user, onAuthRequired }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  const [search, setSearch] = useState("");
  const [chip, setChip] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    type: "team",
    title: "",
    description: "",
    city: "",
    country: "",
    wa: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState("");
  const [reportNote, setReportNote] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const loadPage = useCallback(async (reset) => {
    if (reset) {
      offsetRef.current = 0;
      setHasMore(true);
    }
    const from = offsetRef.current;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("opportunities")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data: rows, error } = await query;

    if (error) {
      if (reset) setPosts([]);
      setHasMore(false);
      return { ok: false };
    }

    const batch = rows || [];
    const memberIds = [...new Set(batch.map((r) => r.member_id).filter(Boolean))];
    let posterById = {};
    if (memberIds.length) {
      const { data: mems } = await supabase.from("members").select("id,name,photo_initials,avatar_url").in("id", memberIds);
      (mems || []).forEach((m) => {
        posterById[m.id] = m;
      });
    }

    const enriched = batch.map((r) => ({
      ...r,
      poster: r.member_id ? posterById[r.member_id] : null,
    }));

    if (reset) setPosts(enriched);
    else setPosts((prev) => [...prev, ...enriched]);

    offsetRef.current = from + batch.length;
    setHasMore(batch.length === PAGE_SIZE);
    return { ok: true };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    offsetRef.current = 0;
    loadPage(true).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [loadPage]);

  useEffect(() => {
    if (!user?.id || !modalOpen) return;
    let canceled = false;
    async function fillWa() {
      const { data } = await supabase.from("members").select("wa").eq("owner_id", user.id).maybeSingle();
      if (canceled || !data?.wa) return;
      setForm((prev) => ({ ...prev, wa: prev.wa || data.wa }));
    }
    fillWa();
    return () => {
      canceled = true;
    };
  }, [user?.id, modalOpen]);

  useEffect(() => {
    function onScroll() {
      if (loadingMore || !hasMore) return;
      if (window.innerHeight + window.scrollY + 120 < document.body.offsetHeight) return;
      setLoadingMore(true);
      loadPage(false).finally(() => setLoadingMore(false));
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [loadingMore, hasMore, loadPage]);

  const filteredPosts = useMemo(() => {
    let list = posts;
    if (chip !== "all") list = list.filter((p) => p.type === chip);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          String(p.title || "")
            .toLowerCase()
            .includes(q) ||
          String(p.description || "")
            .toLowerCase()
            .includes(q) ||
          String(p.city || "")
            .toLowerCase()
            .includes(q)
      );
    }
    return list;
  }, [posts, chip, search]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user?.id) {
      onAuthRequired?.();
      return;
    }
    const title = form.title.trim();
    const description = form.description.trim();
    const city = form.city.trim();
    const country = form.country.trim();
    if (!title || title.length > 100) {
      setFormMsg("Title is required (max 100 characters).");
      return;
    }
    if (!description || description.length > 500) {
      setFormMsg("Description is required (max 500 characters).");
      return;
    }
    if (!city || !country) {
      setFormMsg("City and country are required.");
      return;
    }

    setSubmitting(true);
    setFormMsg("");

    const { data: mem } = await supabase.from("members").select("id").eq("owner_id", user.id).maybeSingle();

    const payload = {
      user_id: user.id,
      member_id: mem?.id || null,
      type: form.type,
      title,
      description,
      city,
      country,
      wa: form.wa.trim() || null,
      active: true,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await supabase.from("opportunities").insert(payload).select("*").single();

    setSubmitting(false);

    if (error) {
      setFormMsg(error.message || "Could not post. Is opportunities table configured?");
      return;
    }

    let posterRow = null;
    if (mem?.id) {
      const { data: pRow } = await supabase.from("members").select("id,name,photo_initials,avatar_url").eq("id", mem.id).maybeSingle();
      posterRow = pRow;
    }

    const row = {
      ...inserted,
      poster: posterRow,
    };

    setPosts((prev) => [row, ...prev]);
    setFormMsg("✅ Posted successfully!");
    setForm({
      type: "team",
      title: "",
      description: "",
      city: "",
      country: "",
      wa: form.wa,
    });
    setTimeout(() => {
      setModalOpen(false);
      setFormMsg("");
    }, 900);
  }

  function connectWa(post) {
    const n = waDigits(post.wa);
    if (!n) return;
    window.open(`https://wa.me/${n}`, "_blank", "noopener");
  }

  function flagPost(post) {
    setReportNote("");
    if (!user?.id) {
      onAuthRequired?.();
      return;
    }
    setReportNote("Thanks — our team will review this post.");
    window.setTimeout(() => setReportNote(""), 4000);
  }

  return (
    <div style={{ padding: "16px 16px 48px", maxWidth: 720, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>📋 Opportunity Board</h1>
          <p style={{ margin: "6px 0 0", color: "var(--color-muted)", fontSize: 14 }}>Connect · Collaborate · Grow</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!user?.id) {
              onAuthRequired?.();
              return;
            }
            setModalOpen(true);
          }}
          style={{
            border: "none",
            borderRadius: 999,
            background: "var(--color-primary)",
            color: "#FFFFFF",
            fontWeight: 700,
            padding: "10px 16px",
            cursor: "pointer",
          }}
        >
          + Post Opportunity
        </button>
      </header>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search opportunities…"
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 14,
          border: "1px solid var(--color-border)",
          marginBottom: 12,
          fontFamily: "Inter, sans-serif",
          fontSize: 14,
        }}
      />

      <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 18, paddingBottom: 4 }}>
        {FILTER_CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setChip(c.key)}
            style={{
              borderRadius: 999,
              border: chip === c.key ? "none" : "1px solid var(--color-border)",
              background: chip === c.key ? "var(--color-primary)" : "#FFFFFF",
              color: chip === c.key ? "#FFFFFF" : "var(--color-muted)",
              fontWeight: 700,
              padding: "8px 14px",
              whiteSpace: "nowrap",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {reportNote ? (
        <div style={{ marginBottom: 12, padding: 10, background: "#EEF2FF", borderRadius: 10, fontSize: 13 }}>{reportNote}</div>
      ) : null}

      {loading ? (
        <p style={{ color: "var(--color-muted)", textAlign: "center" }}>Loading opportunities…</p>
      ) : filteredPosts.length === 0 ? (
        <div style={{ textAlign: "center", padding: 36, background: "#FFFFFF", borderRadius: 20, border: "1px solid var(--color-border)" }}>
          <div style={{ fontSize: 44 }}>📋</div>
          <h2 style={{ margin: "12px 0 8px" }}>No opportunities posted yet</h2>
          <p style={{ color: "var(--color-muted)", marginBottom: 16 }}>Be the first to post!</p>
          <button
            type="button"
            onClick={() => (user?.id ? setModalOpen(true) : onAuthRequired?.())}
            style={{
              border: "none",
              borderRadius: 999,
              background: "var(--color-primary)",
              color: "#FFFFFF",
              fontWeight: 700,
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            Post Opportunity
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {filteredPosts.map((post) => {
            const meta = TYPE_META[post.type] || { label: post.type, color: "#6B7280", chip: post.type };
            const poster = post.poster;
            const initials = String(poster?.photo_initials || poster?.name || "?").slice(0, 2).toUpperCase();
            const expanded = expandedId === post.id;
            const desc = String(post.description || "");
            const shortDesc = desc.length > 120 && !expanded ? `${desc.slice(0, 120)}…` : desc;

            return (
              <article
                key={post.id}
                className="fade-in"
                style={{
                  background: "#FFFFFF",
                  borderRadius: 18,
                  padding: 16,
                  border: "1px solid var(--color-border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                  <span style={{ background: `${meta.color}22`, color: meta.color, borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>
                    {meta.label}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--color-muted)" }}>{timeAgo(post.created_at)}</span>
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800 }}>{post.title}</h3>
                <p style={{ margin: 0, fontSize: 14, color: "var(--color-text)", lineHeight: 1.5 }}>
                  {shortDesc}
                  {desc.length > 120 ? (
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : post.id)}
                      style={{ border: "none", background: "transparent", color: "var(--color-primary)", fontWeight: 700, cursor: "pointer", marginLeft: 6 }}
                    >
                      {expanded ? "Less" : "More"}
                    </button>
                  ) : null}
                </p>
                <div style={{ marginTop: 10, fontSize: 13, color: "var(--color-muted)" }}>
                  📍 {post.city}, {post.country}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#EEF2FF",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 700,
                      fontSize: 12,
                      overflow: "hidden",
                    }}
                  >
                    {poster?.avatar_url ? (
                      <img src={poster.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      initials
                    )}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Posted by: {poster?.name || "Member"}</span>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => connectWa(post)}
                    disabled={!waDigits(post.wa)}
                    style={{
                      border: "none",
                      borderRadius: 10,
                      background: waDigits(post.wa) ? "#10B981" : "#D1D5DB",
                      color: "#FFFFFF",
                      fontWeight: 700,
                      padding: "8px 14px",
                      cursor: waDigits(post.wa) ? "pointer" : "not-allowed",
                    }}
                  >
                    💬 Connect
                  </button>
                  <button
                    type="button"
                    onClick={() => flagPost(post)}
                    style={{
                      border: "1px solid var(--color-border)",
                      borderRadius: 10,
                      background: "#FFFFFF",
                      fontWeight: 600,
                      padding: "8px 14px",
                      cursor: "pointer",
                    }}
                  >
                    🚩 Flag
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {loadingMore ? <p style={{ textAlign: "center", color: "var(--color-muted)", padding: 16 }}>Loading more…</p> : null}
      {!hasMore && posts.length > 0 ? <p style={{ textAlign: "center", color: "var(--color-muted)", padding: 12 }}>You&apos;re all caught up</p> : null}

      {modalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 200,
            display: "grid",
            placeItems: "end center",
            padding: 0,
          }}
          onClick={() => !submitting && setModalOpen(false)}
        >
          <div
            className="slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#FFFFFF",
              borderRadius: "20px 20px 0 0",
              padding: "20px 18px calc(24px + var(--safe-bottom))",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <strong style={{ fontSize: 17 }}>New opportunity</strong>
              <button type="button" onClick={() => setModalOpen(false)} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer", color: "var(--color-muted)" }}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Type
                <select
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--color-border)", fontFamily: "Inter, sans-serif" }}
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Title (required)
                <input
                  value={form.title}
                  maxLength={100}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--color-border)", fontFamily: "Inter, sans-serif" }}
                  required
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Description (required)
                <textarea
                  value={form.description}
                  maxLength={500}
                  rows={4}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--color-border)", fontFamily: "Inter, sans-serif", resize: "vertical" }}
                  required
                />
                <span style={{ fontSize: 12, color: "var(--color-muted)" }}>{form.description.length}/500</span>
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                City (required)
                <input
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--color-border)", fontFamily: "Inter, sans-serif" }}
                  required
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Country (required)
                <input
                  value={form.country}
                  onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                  style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--color-border)", fontFamily: "Inter, sans-serif" }}
                  required
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                WhatsApp
                <input
                  value={form.wa}
                  onChange={(e) => setForm((p) => ({ ...p, wa: e.target.value }))}
                  placeholder="Country code + number"
                  style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--color-border)", fontFamily: "Inter, sans-serif" }}
                />
              </label>
              {formMsg ? <p style={{ margin: 0, fontSize: 14, color: formMsg.startsWith("✅") ? "#10B981" : "#DC2626" }}>{formMsg}</p> : null}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  border: "none",
                  borderRadius: 14,
                  background: "var(--color-primary)",
                  color: "#FFFFFF",
                  fontWeight: 800,
                  padding: "14px 16px",
                  cursor: submitting ? "wait" : "pointer",
                }}
              >
                {submitting ? "Posting…" : "Submit"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
