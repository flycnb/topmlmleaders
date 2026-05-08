import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const ADMIN_EMAIL = "admin@topmlmleaders.com";
const TABS = ["dashboard", "members", "flags", "broadcast", "coupons", "ai settings"];

function timeAgo(value) {
  if (!value) return "";
  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} mins ago`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours} hrs ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function randomCouponCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function AdminPanel({ user, onBack }) {
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    members: 0,
    revenue: "₹0",
    bookings: 0,
    flags: 0,
    plans: { elite: 0, pro: 0, company: 0, free: 0 },
  });
  const [members, setMembers] = useState([]);
  const [flags, setFlags] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [aiSettings, setAiSettings] = useState({ provider: "claude", available_to: "loggedin" });
  const [membersSearch, setMembersSearch] = useState("");
  const [broadcastForm, setBroadcastForm] = useState({
    plan: "all",
    city: "",
    country: "",
    subject: "",
    message: "",
  });
  const [couponForm, setCouponForm] = useState({
    code: "",
    discountType: "percent",
    discountValue: "",
    maxUses: 100,
    expiresAt: "",
    active: true,
  });
  const [couponStatus, setCouponStatus] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [memberActionStatus, setMemberActionStatus] = useState("");
  const [flagStatus, setFlagStatus] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    async function loadAll() {
      setLoading(true);
      const [membersRes, bookingsRes, flagsRes, couponsRes, aiRes] = await Promise.all([
        supabase.from("members").select("*").order("created_at", { ascending: false }),
        supabase.from("bookings").select("*", { count: "exact" }),
        supabase.from("flags").select("*").order("created_at", { ascending: false }),
        supabase.from("coupons").select("*").order("created_at", { ascending: false }),
        supabase.from("ai_settings").select("*").limit(1).maybeSingle(),
      ]);
      if (!active) return;

      const membersRows = membersRes.data || [];
      const flagsRows = flagsRes.data || [];
      setMembers(membersRows);
      setFlags(flagsRows);
      setCoupons(couponsRes.data || []);
      if (aiRes.data) setAiSettings(aiRes.data);

      const plans = { elite: 0, pro: 0, company: 0, free: 0 };
      membersRows.forEach((row) => {
        if (plans[row.plan] !== undefined) plans[row.plan] += 1;
        else plans.free += 1;
      });
      setStats({
        members: membersRows.length,
        revenue: "₹0",
        bookings: bookingsRes.count || 0,
        flags: flagsRows.length,
        plans,
      });
      setLoading(false);
    }
    loadAll();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const membersByOwnerId = useMemo(() => {
    const map = {};
    members.forEach((row) => {
      map[row.owner_id] = row;
    });
    return map;
  }, [members]);

  const filteredMembers = useMemo(() => {
    const query = membersSearch.toLowerCase().trim();
    if (!query) return members;
    return members.filter((row) => {
      return (
        String(row.name || "").toLowerCase().includes(query) ||
        String(row.email || "").toLowerCase().includes(query) ||
        String(row.city || "").toLowerCase().includes(query) ||
        String(row.company || "").toLowerCase().includes(query)
      );
    });
  }, [members, membersSearch]);

  const topCities = useMemo(() => {
    const counts = {};
    members.forEach((row) => {
      const city = row.city || "Unknown";
      counts[city] = (counts[city] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [members]);

  async function toggleVerified(member) {
    const next = !member.verified;
    const { error } = await supabase.from("members").update({ verified: next }).eq("id", member.id);
    if (error) {
      setMemberActionStatus(`Could not update verification: ${error.message}`);
      return;
    }
    setMembers((prev) => prev.map((row) => (row.id === member.id ? { ...row, verified: next } : row)));
    setMemberActionStatus("Member verification updated.");
  }

  async function updatePlan(member, plan) {
    const { error } = await supabase.from("members").update({ plan }).eq("id", member.id);
    if (error) {
      setMemberActionStatus(`Could not update plan: ${error.message}`);
      return;
    }
    setMembers((prev) => prev.map((row) => (row.id === member.id ? { ...row, plan } : row)));
    setMemberActionStatus("Member plan updated.");
  }

  async function suspendMember(member) {
    const { error } = await supabase.from("members").delete().eq("id", member.id);
    if (error) {
      setMemberActionStatus(`Could not suspend member: ${error.message}`);
      return;
    }
    setMembers((prev) => prev.filter((row) => row.id !== member.id));
    setMemberActionStatus("Member suspended (removed).");
  }

  async function clearFlag(flagId) {
    const { error } = await supabase.from("flags").delete().eq("id", flagId);
    if (error) {
      setFlagStatus(`Could not clear flag: ${error.message}`);
      return;
    }
    setFlags((prev) => prev.filter((row) => row.id !== flagId));
    setFlagStatus("Flag cleared.");
  }

  async function suspendFlaggedMember(memberId) {
    const { error } = await supabase.from("members").update({ verified: false }).eq("id", memberId);
    if (error) {
      setFlagStatus(`Could not suspend member: ${error.message}`);
      return;
    }
    setMembers((prev) =>
      prev.map((row) => (row.id === memberId ? { ...row, verified: false } : row))
    );
    setFlagStatus("Member marked unverified.");
  }

  async function createCoupon() {
    setCouponStatus("");
    if (!couponForm.code.trim()) {
      setCouponStatus("Coupon code is required.");
      return;
    }
    if (Number(couponForm.discountValue) <= 0) {
      setCouponStatus("Discount value must be greater than 0.");
      return;
    }
    const payload = {
      code: couponForm.code.trim().toUpperCase(),
      discount_type: couponForm.discountType,
      discount_value: Number(couponForm.discountValue),
      max_uses: Number(couponForm.maxUses || 100),
      expires_at: couponForm.expiresAt ? new Date(couponForm.expiresAt).toISOString() : null,
      active: Boolean(couponForm.active),
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("coupons").insert(payload).select("*").single();
    if (error) {
      setCouponStatus(`Could not create coupon: ${error.message}`);
      return;
    }
    setCoupons((prev) => [data, ...prev]);
    setCouponStatus(`✅ Coupon ${payload.code} created!`);
  }

  async function toggleCouponActive(coupon) {
    const { error } = await supabase
      .from("coupons")
      .update({ active: !coupon.active })
      .eq("id", coupon.id);
    if (!error) {
      setCoupons((prev) =>
        prev.map((row) => (row.id === coupon.id ? { ...row, active: !coupon.active } : row))
      );
    }
  }

  async function deleteCoupon(couponId) {
    const { error } = await supabase.from("coupons").delete().eq("id", couponId);
    if (!error) setCoupons((prev) => prev.filter((row) => row.id !== couponId));
  }

  async function saveAiSettings() {
    const payload = {
      id: aiSettings.id || "00000000-0000-0000-0000-000000000001",
      provider: aiSettings.provider,
      available_to: aiSettings.available_to,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("ai_settings").upsert(payload);
    setAiStatus(error ? `Could not save: ${error.message}` : "✅ AI settings saved!");
  }

  function StatCard({ icon, label, value }) {
    return (
      <div
        style={{
          border: "1px solid #334155",
          borderRadius: 14,
          padding: 12,
          background: "#1E293B",
        }}
      >
        <div style={{ color: "#94A3B8", fontSize: 13 }}>{icon} {label}</div>
        <div style={{ color: "#F1F5F9", fontWeight: 800, fontSize: 24, marginTop: 4 }}>{value}</div>
      </div>
    );
  }

  function renderDashboard() {
    const planTotal = Math.max(1, stats.members);
    const recentMembers = members.slice(0, 5);
    const recentFlags = flags.slice(0, 3);
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          <StatCard icon="👥" label="Total Members" value={stats.members} />
          <StatCard icon="💰" label="Revenue" value={stats.revenue} />
          <StatCard icon="📅" label="Bookings" value={stats.bookings} />
          <StatCard icon="🚩" label="Flags" value={stats.flags} />
        </div>
        <section style={{ border: "1px solid #334155", borderRadius: 14, padding: 12, background: "#1E293B" }}>
          <h3 style={{ margin: "0 0 10px", color: "#F1F5F9" }}>Plans breakdown</h3>
          {["elite", "pro", "company", "free"].map((plan) => {
            const count = stats.plans[plan];
            const pct = Math.round((count / planTotal) * 100);
            return (
              <div key={plan} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#94A3B8", fontSize: 13, marginBottom: 4 }}>
                  <span>{plan.toUpperCase()}</span>
                  <span>{count}</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: "#0F172A" }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "#6C63FF" }} />
                </div>
              </div>
            );
          })}
        </section>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <section style={{ border: "1px solid #334155", borderRadius: 14, padding: 12, background: "#1E293B" }}>
            <h3 style={{ margin: "0 0 8px", color: "#F1F5F9" }}>Top cities</h3>
            {topCities.length ? topCities.map(([city, count]) => (
              <div key={city} style={{ display: "flex", justifyContent: "space-between", color: "#94A3B8", padding: "4px 0" }}>
                <span>{city}</span>
                <strong style={{ color: "#F1F5F9" }}>{count}</strong>
              </div>
            )) : <p style={{ color: "#94A3B8" }}>No city data.</p>}
          </section>
          <section style={{ border: "1px solid #334155", borderRadius: 14, padding: 12, background: "#1E293B" }}>
            <h3 style={{ margin: "0 0 8px", color: "#F1F5F9" }}>Recent members</h3>
            {recentMembers.length ? recentMembers.map((row) => (
              <div key={row.id} style={{ color: "#94A3B8", padding: "4px 0" }}>
                {row.name || "Member"} · {timeAgo(row.created_at)}
              </div>
            )) : <p style={{ color: "#94A3B8" }}>No recent members.</p>}
          </section>
        </div>
        <section style={{ border: "1px solid #334155", borderRadius: 14, padding: 12, background: "#1E293B" }}>
          <h3 style={{ margin: "0 0 8px", color: "#F1F5F9" }}>Recent flags</h3>
          {recentFlags.length ? recentFlags.map((row) => {
            const member = members.find((m) => m.id === row.member_id);
            return (
              <div key={row.id} style={{ color: "#94A3B8", padding: "4px 0" }}>
                {member?.name || "Member"} · {row.reason} · {timeAgo(row.created_at)}
              </div>
            );
          }) : <p style={{ color: "#94A3B8" }}>No flags yet.</p>}
        </section>
      </div>
    );
  }

  function renderMembers() {
    return (
      <section style={{ border: "1px solid #334155", borderRadius: 14, padding: 12, background: "#1E293B" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <input
            value={membersSearch}
            onChange={(event) => setMembersSearch(event.target.value)}
            placeholder="Search by name, email, city, company"
            style={{
              flex: 1,
              border: "1px solid #334155",
              borderRadius: 10,
              padding: "10px 12px",
              background: "#0F172A",
              color: "#F1F5F9",
            }}
          />
          <strong style={{ color: "#F1F5F9" }}>{filteredMembers.length} members</strong>
        </div>
        {memberActionStatus ? <p style={{ color: "#94A3B8", margin: "0 0 10px" }}>{memberActionStatus}</p> : null}
        <div style={{ display: "grid", gap: 8 }}>
          {filteredMembers.map((row) => (
            <div key={row.id} style={{ border: "1px solid #334155", borderRadius: 10, padding: 10, background: "#0F172A" }}>
              <div style={{ display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 10, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#6C63FF", color: "#FFFFFF", display: "grid", placeItems: "center", fontWeight: 700 }}>
                  {String(row.photo_initials || row.name || "M").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ color: "#F1F5F9", fontWeight: 700 }}>{row.name || "Member"}</div>
                  <div style={{ color: "#94A3B8", fontSize: 12 }}>{row.email || "-"}</div>
                  <div style={{ color: "#94A3B8", fontSize: 12 }}>
                    {row.city || "-"}, {row.country || "-"} · {row.company || "-"} · {row.role || "-"}
                  </div>
                </div>
                <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
                  <span style={{ borderRadius: 999, padding: "2px 8px", fontSize: 11, color: "#F1F5F9", background: "#334155" }}>
                    {String(row.plan || "free").toUpperCase()}
                  </span>
                  {row.verified ? (
                    <span style={{ borderRadius: 999, padding: "2px 8px", fontSize: 11, color: "#10B981", border: "1px solid #10B981" }}>Verified</span>
                  ) : (
                    <span style={{ borderRadius: 999, padding: "2px 8px", fontSize: 11, color: "#94A3B8", border: "1px solid #334155" }}>Unverified</span>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button type="button" onClick={() => toggleVerified(row)} style={{ border: "1px solid #334155", borderRadius: 8, background: "#1E293B", color: "#F1F5F9", padding: "6px 8px", fontWeight: 700, cursor: "pointer" }}>
                  Verify ✓
                </button>
                <select value={row.plan || "free"} onChange={(event) => updatePlan(row, event.target.value)} style={{ border: "1px solid #334155", borderRadius: 8, background: "#1E293B", color: "#F1F5F9", padding: "6px 8px" }}>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="elite">Elite</option>
                  <option value="company">Company</option>
                </select>
                <button type="button" onClick={() => suspendMember(row)} style={{ border: "1px solid #EF4444", borderRadius: 8, background: "transparent", color: "#EF4444", padding: "6px 8px", fontWeight: 700, cursor: "pointer" }}>
                  Suspend
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderFlags() {
    return (
      <section style={{ border: "1px solid #334155", borderRadius: 14, padding: 12, background: "#1E293B" }}>
        <h3 style={{ margin: "0 0 10px", color: "#F1F5F9" }}>Reported flags</h3>
        {flagStatus ? <p style={{ color: "#94A3B8", margin: "0 0 10px" }}>{flagStatus}</p> : null}
        {flags.length === 0 ? (
          <p style={{ color: "#94A3B8" }}>No flags — community is clean! 🎉</p>
        ) : (
          flags.map((row) => {
            const reported = members.find((m) => m.id === row.member_id);
            const reporter = membersByOwnerId[row.reporter_id];
            return (
              <div key={row.id} style={{ border: "1px solid #334155", borderRadius: 10, padding: 10, background: "#0F172A", marginBottom: 8 }}>
                <div style={{ color: "#F1F5F9", fontWeight: 700 }}>
                  {reported?.name || "Unknown member"} reported by {reporter?.name || "Unknown user"}
                </div>
                <div style={{ marginTop: 4, color: "#94A3B8", fontSize: 13 }}>
                  {row.reason} · {formatDate(row.created_at)}
                </div>
                {row.description ? (
                  <p style={{ margin: "6px 0 0", color: "#94A3B8" }}>{row.description}</p>
                ) : null}
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => clearFlag(row.id)} style={{ border: "1px solid #334155", borderRadius: 8, background: "#1E293B", color: "#F1F5F9", padding: "6px 8px", fontWeight: 700 }}>
                    Clear flag
                  </button>
                  {reported?.id ? (
                    <button type="button" onClick={() => suspendFlaggedMember(reported.id)} style={{ border: "1px solid #EF4444", borderRadius: 8, background: "transparent", color: "#EF4444", padding: "6px 8px", fontWeight: 700 }}>
                      Suspend member
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </section>
    );
  }

  function renderBroadcast() {
    return (
      <section style={{ border: "1px solid #334155", borderRadius: 14, padding: 12, background: "#1E293B", display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0, color: "#F1F5F9" }}>Broadcast tool</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <select value={broadcastForm.plan} onChange={(event) => setBroadcastForm((prev) => ({ ...prev, plan: event.target.value }))} style={{ border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", background: "#0F172A", color: "#F1F5F9" }}>
            <option value="all">All</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="elite">Elite</option>
            <option value="company">Company</option>
          </select>
          <input value={broadcastForm.city} onChange={(event) => setBroadcastForm((prev) => ({ ...prev, city: event.target.value }))} placeholder="City filter" style={{ border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", background: "#0F172A", color: "#F1F5F9" }} />
          <input value={broadcastForm.country} onChange={(event) => setBroadcastForm((prev) => ({ ...prev, country: event.target.value }))} placeholder="Country filter" style={{ border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", background: "#0F172A", color: "#F1F5F9" }} />
        </div>
        <input value={broadcastForm.subject} onChange={(event) => setBroadcastForm((prev) => ({ ...prev, subject: event.target.value }))} placeholder="Subject line" style={{ border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", background: "#0F172A", color: "#F1F5F9" }} />
        <textarea value={broadcastForm.message} onChange={(event) => setBroadcastForm((prev) => ({ ...prev, message: event.target.value }))} rows={4} placeholder="Broadcast message" style={{ border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", background: "#0F172A", color: "#F1F5F9" }} />
        <div style={{ color: "#94A3B8", fontSize: 12 }}>{broadcastForm.message.length} characters</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" disabled style={{ border: "1px solid #334155", borderRadius: 10, background: "#0F172A", color: "#94A3B8", padding: "8px 10px", cursor: "not-allowed" }}>
            📧 Send Email (Coming soon)
          </button>
          <button type="button" disabled style={{ border: "1px solid #334155", borderRadius: 10, background: "#0F172A", color: "#94A3B8", padding: "8px 10px", cursor: "not-allowed" }}>
            💬 Send WhatsApp (Coming soon)
          </button>
        </div>
        <p style={{ margin: 0, color: "#94A3B8", fontSize: 12 }}>
          Broadcast via Resend.com email — coming in Phase 9.
        </p>
      </section>
    );
  }

  function renderCoupons() {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <section style={{ border: "1px solid #334155", borderRadius: 14, padding: 12, background: "#1E293B", display: "grid", gap: 8 }}>
          <h3 style={{ margin: 0, color: "#F1F5F9" }}>Create new coupon</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={couponForm.code} onChange={(event) => setCouponForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))} placeholder="Coupon code" style={{ flex: 1, border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", background: "#0F172A", color: "#F1F5F9", fontFamily: "monospace" }} />
            <button type="button" onClick={() => setCouponForm((prev) => ({ ...prev, code: randomCouponCode() }))} style={{ border: "1px solid #334155", borderRadius: 10, background: "#0F172A", color: "#F1F5F9", padding: "10px 12px", fontWeight: 700 }}>
              Auto-generate
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <select value={couponForm.discountType} onChange={(event) => setCouponForm((prev) => ({ ...prev, discountType: event.target.value }))} style={{ border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", background: "#0F172A", color: "#F1F5F9" }}>
              <option value="percent">% Percent</option>
              <option value="fixed">₹ Fixed</option>
            </select>
            <input type="number" value={couponForm.discountValue} onChange={(event) => setCouponForm((prev) => ({ ...prev, discountValue: event.target.value }))} placeholder="Discount value" style={{ border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", background: "#0F172A", color: "#F1F5F9" }} />
            <input type="number" value={couponForm.maxUses} onChange={(event) => setCouponForm((prev) => ({ ...prev, maxUses: event.target.value }))} placeholder="Max uses" style={{ border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", background: "#0F172A", color: "#F1F5F9" }} />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" value={couponForm.expiresAt} onChange={(event) => setCouponForm((prev) => ({ ...prev, expiresAt: event.target.value }))} style={{ border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", background: "#0F172A", color: "#F1F5F9" }} />
            <label style={{ color: "#94A3B8", display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={couponForm.active} onChange={(event) => setCouponForm((prev) => ({ ...prev, active: event.target.checked }))} />
              Active
            </label>
          </div>
          <button type="button" onClick={createCoupon} style={{ border: "none", borderRadius: 10, background: "#6C63FF", color: "#FFFFFF", padding: "10px 12px", fontWeight: 700 }}>
            Create coupon
          </button>
          {couponStatus ? <p style={{ margin: 0, color: "#94A3B8" }}>{couponStatus}</p> : null}
        </section>

        <section style={{ border: "1px solid #334155", borderRadius: 14, padding: 12, background: "#1E293B" }}>
          <h3 style={{ margin: "0 0 8px", color: "#F1F5F9" }}>Existing coupons</h3>
          {coupons.length === 0 ? (
            <p style={{ color: "#94A3B8" }}>No coupons yet</p>
          ) : (
            coupons.map((row) => (
              <div key={row.id} style={{ border: "1px solid #334155", borderRadius: 10, padding: 10, background: "#0F172A", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <strong style={{ color: "#F1F5F9", fontFamily: "monospace" }}>{row.code}</strong>
                  <button type="button" onClick={() => deleteCoupon(row.id)} style={{ border: "1px solid #EF4444", borderRadius: 8, background: "transparent", color: "#EF4444", padding: "6px 8px", fontWeight: 700 }}>
                    Delete
                  </button>
                </div>
                <div style={{ color: "#94A3B8", fontSize: 13, marginTop: 4 }}>
                  {row.discount_type === "percent" ? `${row.discount_value}%` : `₹${row.discount_value} off`} · Used: {row.used_count || 0} / {row.max_uses || 0} · Expires: {formatDate(row.expires_at)}
                </div>
                <label style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, color: "#94A3B8" }}>
                  <input type="checkbox" checked={Boolean(row.active)} onChange={() => toggleCouponActive(row)} />
                  Active
                </label>
              </div>
            ))
          )}
        </section>
      </div>
    );
  }

  function renderAiSettings() {
    return (
      <section style={{ border: "1px solid #334155", borderRadius: 14, padding: 12, background: "#1E293B", display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0, color: "#F1F5F9" }}>AI Settings</h3>
        <div>
          <div style={{ color: "#94A3B8", marginBottom: 6 }}>Provider</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {[
              { id: "claude", label: "🤖 Claude" },
              { id: "gemini", label: "🌟 Gemini" },
              { id: "off", label: "❌ Off" },
            ].map((item) => (
              <button key={item.id} type="button" onClick={() => setAiSettings((prev) => ({ ...prev, provider: item.id }))} style={{ border: `1px solid ${aiSettings.provider === item.id ? "#6C63FF" : "#334155"}`, borderRadius: 10, background: aiSettings.provider === item.id ? "rgba(108,99,255,0.2)" : "#0F172A", color: "#F1F5F9", padding: "10px 12px", fontWeight: 700 }}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ color: "#94A3B8", marginBottom: 6 }}>Availability</div>
          <div style={{ display: "grid", gap: 8 }}>
            {[
              { id: "all", label: "🌍 Everyone" },
              { id: "loggedin", label: "🔐 Logged in users only" },
              { id: "paid", label: "💎 Paid members only" },
            ].map((item) => (
              <button key={item.id} type="button" onClick={() => setAiSettings((prev) => ({ ...prev, available_to: item.id }))} style={{ textAlign: "left", border: `1px solid ${aiSettings.available_to === item.id ? "#6C63FF" : "#334155"}`, borderRadius: 10, background: aiSettings.available_to === item.id ? "rgba(108,99,255,0.2)" : "#0F172A", color: "#F1F5F9", padding: "10px 12px", fontWeight: 700 }}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={saveAiSettings} style={{ border: "none", borderRadius: 10, background: "#6C63FF", color: "#FFFFFF", padding: "10px 12px", fontWeight: 700 }}>
          Save settings
        </button>
        <div style={{ color: "#94A3B8" }}>
          Current: {aiSettings.provider} · {aiSettings.available_to}
        </div>
        {aiStatus ? <div style={{ color: "#94A3B8" }}>{aiStatus}</div> : null}
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <main style={{ minHeight: "100vh", background: "#0F172A", color: "#F1F5F9", display: "grid", placeItems: "center", padding: 20 }}>
        <div style={{ textAlign: "center" }}>
          <h2>Admin access denied</h2>
          <button type="button" onClick={onBack} style={{ border: "1px solid #334155", borderRadius: 999, background: "transparent", color: "#F1F5F9", padding: "10px 14px", fontWeight: 700 }}>
            Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", color: "#F1F5F9" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#0F172A", borderBottom: "1px solid #334155", padding: 16 }}>
        <button type="button" onClick={onBack} style={{ border: "1px solid #334155", borderRadius: 10, background: "transparent", color: "#F1F5F9", padding: "8px 12px", fontWeight: 700, marginBottom: 10 }}>
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: 28 }}>⚡ Admin Panel</h1>
        <div style={{ color: "#94A3B8", marginTop: 4 }}>TopMLMLeaders.com</div>
      </header>

      <main style={{ padding: 16 }}>
        {loading ? <p style={{ color: "#94A3B8" }}>Loading admin data...</p> : null}
        <nav style={{ marginBottom: 12, borderBottom: "1px solid #334155" }}>
          <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            {TABS.map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)} style={{ border: "none", background: "transparent", color: activeTab === tab ? "#6C63FF" : "#94A3B8", borderBottom: activeTab === tab ? "2px solid #6C63FF" : "2px solid transparent", padding: "10px 8px", textTransform: "capitalize", fontWeight: activeTab === tab ? 800 : 600, whiteSpace: "nowrap", cursor: "pointer" }}>
                {tab}
              </button>
            ))}
          </div>
        </nav>

        {activeTab === "dashboard" ? renderDashboard() : null}
        {activeTab === "members" ? renderMembers() : null}
        {activeTab === "flags" ? renderFlags() : null}
        {activeTab === "broadcast" ? renderBroadcast() : null}
        {activeTab === "coupons" ? renderCoupons() : null}
        {activeTab === "ai settings" ? renderAiSettings() : null}
      </main>
    </div>
  );
}

export default AdminPanel;

