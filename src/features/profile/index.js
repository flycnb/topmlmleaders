import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import ShareSheet from "../../components/ShareSheet";
import QRCodeModal from "../../components/QRCode";

const TABS = ["about", "gallery", "services", "events", "join us", "team", "book"];

/** Must match bucket id in Supabase Dashboard → Storage (this project uses avtars). */
const AVATAR_STORAGE_BUCKET = "avtars";
const SLOT_DAYS = [
  { label: "Today", slots: [{ id: "t1", time: "6:00 PM", type: "Call", booked: false }, { id: "t2", time: "8:00 PM", type: "WA Video", booked: true }] },
  { label: "Tomorrow", slots: [{ id: "n1", time: "4:00 PM", type: "WA Video", booked: false }, { id: "n2", time: "7:00 PM", type: "In-Person", booked: false }] },
];

/** Normalize jsonb `badges` from Supabase into display labels (strings). */
function badgeLabelsFromBadges(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const label = item.label ?? item.name ?? item.title ?? item.text;
          if (label != null && String(label).trim()) return String(label).trim();
        }
        return String(item ?? "").trim();
      })
      .filter(Boolean);
  }
  if (typeof raw === "object") {
    const fromFlags = Object.entries(raw)
      .filter(([, v]) => v === true || v === 1 || v === "true" || v === "1")
      .map(([k]) => k.replace(/_/g, " "));
    if (fromFlags.length) return fromFlags;
    if (Array.isArray(raw.items)) return badgeLabelsFromBadges(raw.items);
  }
  return [];
}

function formatJoinedDateDisplay(value) {
  if (value == null || value === "") return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function formatEarningsDisplay(value) {
  if (value == null || value === "") return "";
  if (typeof value === "number" && !Number.isNaN(value)) return value.toLocaleString();
  return String(value);
}

/** Normalize `members.gallery_urls` (jsonb array or legacy string) for the Gallery tab. */
function normalizeGalleryUrls(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((u) => typeof u === "string" && u.trim());
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((u) => typeof u === "string" && u.trim());
      }
    } catch {
      /* ignore */
    }
  }
  return [];
}

function normalizeMember(member) {
  if (!member) return null;
  const description =
    member.description != null && member.description !== "" ? String(member.description).trim() : "";
  const teamSize =
    member.teamSize !== undefined && member.teamSize !== null && member.teamSize !== ""
      ? member.teamSize
      : member.team_size !== undefined && member.team_size !== null && member.team_size !== ""
        ? member.team_size
        : "";
  const earnings = member.earnings !== undefined && member.earnings !== null ? member.earnings : "";
  const joinedDate =
    member.joinedDate != null && member.joinedDate !== ""
      ? member.joinedDate
      : member.joined_date != null && member.joined_date !== ""
        ? member.joined_date
        : "";

  return {
    ...member,
    ownerId: member.ownerId || member.owner_id || "",
    avatarUrl: member.avatarUrl || member.avatar_url || "",
    initials: member.initials || member.photo_initials || "ML",
    followerCount: Number(member.followerCount ?? member.follower_count ?? 0),
    youtubeUrl: member.youtubeUrl || member.youtube_url || "",
    phoneVisibility: member.phoneVisibility || member.phone_visibility || "private",
    waVisibility: member.waVisibility || member.wa_visibility || "private",
    description,
    teamSize,
    earnings,
    joinedDate,
    badges: badgeLabelsFromBadges(member.badges),
  };
}

function card(title, body) {
  return (
    <section style={{ background: "#FFFFFF", borderRadius: 14, boxShadow: "var(--shadow-card)", padding: 14, marginBottom: 12 }}>
      <h3 style={{ margin: "0 0 10px", color: "var(--color-primary)" }}>{title}</h3>
      {body}
    </section>
  );
}

function MemberProfile({ member, user, onAuthRequired, isFollowing, toggleFollow, onOpenChat, onBack }) {
  const [liveMember, setLiveMember] = useState(normalizeMember(member) || {});
  const [activeTab, setActiveTab] = useState("about");
  const [showShare, setShowShare] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [followers, setFollowers] = useState(Number(member?.followerCount ?? member?.follower_count ?? 0));
  const [uploading, setUploading] = useState(false);
  const [avatarUploadStatus, setAvatarUploadStatus] = useState("");
  const [youtubeInput, setYoutubeInput] = useState(member?.youtubeUrl || member?.youtube_url || "");
  const [joinForm, setJoinForm] = useState({ name: "", wa: "", city: "", experience: "No experience" });
  const [joinStatus, setJoinStatus] = useState("");
  const [activeDay, setActiveDay] = useState(0);
  const [bookingName, setBookingName] = useState(user?.name || "");
  const [bookingStatus, setBookingStatus] = useState("");
  const [star, setStar] = useState(0);
  const [rated, setRated] = useState(false);
  const [lightbox, setLightbox] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    const normalized = normalizeMember(member) || {};
    setLiveMember(normalized);
    setFollowers(Number(normalized.followerCount || 0));
    setYoutubeInput(normalized.youtubeUrl || "");
  }, [member]);

  useEffect(() => {
    const id = member?.id;
    if (!id) return undefined;
    let canceled = false;
    (async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (canceled || error || !data) return;
      setLiveMember((prev) => normalizeMember({ ...prev, ...data }) || {});
    })();
    return () => {
      canceled = true;
    };
  }, [member?.id]);

  useEffect(() => setBookingName(user?.name || ""), [user?.name]);

  const canEdit = Boolean(user?.id && user.id === liveMember.ownerId);
  const color = liveMember.color || "#6C63FF";
  const phoneAllowed = liveMember.phoneVisibility === "public" || (user && liveMember.phoneVisibility !== "private");
  const waAllowed = liveMember.waVisibility === "public" || (user && liveMember.waVisibility !== "private");
  const galleryPhotoUrls = normalizeGalleryUrls(liveMember.gallery_urls);
  const services = Array.isArray(liveMember.services) ? liveMember.services : [];
  const events = Array.isArray(liveMember.events) ? liveMember.events : [];
  const team = Array.isArray(liveMember.team) ? liveMember.team : [];

  async function onUploadPhoto(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (input) input.value = "";
    if (!file || !canEdit || !liveMember.id || !user?.id) return;
    setAvatarUploadStatus("");
    setUploading(true);
    try {
      const rawExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const ext = ["jpg", "jpeg", "png", "webp", "gif"].includes(rawExt) ? rawExt : "jpg";
      const path = `${liveMember.id}-${Date.now()}.${ext}`;
      const contentType = file.type || `image/${ext === "jpg" ? "jpeg" : ext}`;
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_STORAGE_BUCKET)
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType });
      if (uploadError) {
        console.error("[TICKET-003 avatar] storage upload failed", uploadError);
        setAvatarUploadStatus(`Photo upload failed: ${uploadError.message}`);
        return;
      }
      const publicUrl = supabase.storage.from(AVATAR_STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
      const { error: dbError } = await supabase
        .from("members")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", liveMember.id)
        .eq("owner_id", user.id);
      if (dbError) {
        console.error("[TICKET-003 avatar] members update failed", dbError);
        setAvatarUploadStatus(`Photo uploaded but not saved: ${dbError.message}`);
        return;
      }
      setLiveMember((prev) => ({ ...prev, avatarUrl: publicUrl }));
      setAvatarUploadStatus("✅ Profile photo updated!");
      window.setTimeout(() => {
        setAvatarUploadStatus((prev) => (prev === "✅ Profile photo updated!" ? "" : prev));
      }, 4000);
    } catch (e) {
      console.error("[TICKET-003 avatar] unexpected", e);
      setAvatarUploadStatus(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onSaveYoutube() {
    if (!canEdit || !liveMember.id) return;
    const { error } = await supabase.from("members").update({ youtube_url: youtubeInput.trim() || null }).eq("id", liveMember.id);
    if (!error) setLiveMember((prev) => ({ ...prev, youtubeUrl: youtubeInput.trim() }));
  }

  async function onJoinSubmit(event) {
    event.preventDefault();
    setJoinStatus("Submitting...");
    const { error } = await supabase.from("join_requests").insert({
      member_id: liveMember.id,
      name: joinForm.name,
      wa: joinForm.wa,
      city: joinForm.city,
      experience: joinForm.experience,
      created_at: new Date().toISOString(),
    });
    if (error) setJoinStatus("Could not submit. Please try again.");
    else {
      setJoinStatus("Success! Your request has been submitted.");
      setJoinForm({ name: "", wa: "", city: "", experience: "No experience" });
    }
  }

  async function onBook(slot) {
    if (!user?.id) {
      onAuthRequired();
      return;
    }
    setBookingStatus("Saving booking...");
    const { error } = await supabase.from("bookings").insert({
      member_id: liveMember.id,
      booker_id: user.id,
      booker_name: bookingName || "Member",
      slot_day: SLOT_DAYS[activeDay].label,
      slot_time: slot.time,
      slot_type: slot.type,
      status: "pending",
    });
    setBookingStatus(error ? "Could not save booking." : "Booking requested successfully.");
  }

  function openWa() {
    if (!waAllowed || !liveMember.wa) {
      onAuthRequired();
      return;
    }
    window.open(`https://wa.me/${String(liveMember.wa).replace(/[^\d]/g, "")}`, "_blank", "noopener");
  }

  function onProfileFollow() {
    toggleFollow(liveMember, (delta) => setFollowers((prev) => Math.max(0, prev + delta)));
  }

  function renderAbout() {
    const rows = [];
    const hasTeam =
      liveMember.teamSize !== undefined &&
      liveMember.teamSize !== null &&
      String(liveMember.teamSize).trim() !== "";
    const hasEarnings =
      liveMember.earnings !== undefined &&
      liveMember.earnings !== null &&
      String(liveMember.earnings).trim() !== "";
    const hasJoined = Boolean(liveMember.joinedDate);
    if (hasTeam || hasEarnings || hasJoined) {
      rows.push(
        card(
          "Snapshot",
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14 }}>
            {hasTeam ? (
              <div>
                <div style={{ fontSize: 12, color: "var(--color-muted)", fontWeight: 600 }}>Team size</div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{String(liveMember.teamSize)}</div>
              </div>
            ) : null}
            {hasEarnings ? (
              <div>
                <div style={{ fontSize: 12, color: "var(--color-muted)", fontWeight: 600 }}>Earnings</div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{formatEarningsDisplay(liveMember.earnings)}</div>
              </div>
            ) : null}
            {hasJoined ? (
              <div>
                <div style={{ fontSize: 12, color: "var(--color-muted)", fontWeight: 600 }}>Member since</div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{formatJoinedDateDisplay(liveMember.joinedDate)}</div>
              </div>
            ) : null}
          </div>
        )
      );
    }
    if (Array.isArray(liveMember.badges) && liveMember.badges.length) {
      rows.push(
        card(
          "Badges",
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {liveMember.badges.map((label, index) => (
              <span
                key={`${label}-${index}`}
                style={{
                  borderRadius: 999,
                  padding: "6px 12px",
                  background: "#EEF2FF",
                  color: "var(--color-primary)",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {label}
              </span>
            ))}
          </div>
        )
      );
    }
    if (liveMember.description) rows.push(card("About Me", <p style={{ margin: 0, lineHeight: 1.7 }}>{liveMember.description}</p>));
    if (phoneAllowed || waAllowed) {
      rows.push(
        card(
          "Contact",
          <div style={{ display: "grid", gap: 8 }}>
            {phoneAllowed ? <button type="button" style={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "#FFFFFF", padding: 10, fontWeight: 700 }}>📞 Call</button> : null}
            {waAllowed ? <button type="button" onClick={openWa} style={{ borderRadius: 12, border: "none", background: "#10B981", color: "#FFFFFF", padding: 10, fontWeight: 700, cursor: "pointer" }}>💬 WhatsApp</button> : null}
          </div>
        )
      );
    }
    if (canEdit || liveMember.youtubeUrl) {
      rows.push(
        card(
          "My Video",
          <div>
            {canEdit ? (
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input value={youtubeInput} onChange={(event) => setYoutubeInput(event.target.value)} placeholder="Paste YouTube URL" style={{ flex: 1, border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px", fontFamily: "Inter, sans-serif" }} />
                <button type="button" onClick={onSaveYoutube} style={{ border: "none", borderRadius: 10, padding: "0 12px", background: color, color: "#FFFFFF", fontWeight: 700, cursor: "pointer" }}>Save</button>
              </div>
            ) : null}
            {liveMember.youtubeUrl ? (
              <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: 12, overflow: "hidden" }}>
                <iframe title="YouTube video" src={liveMember.youtubeUrl.replace("watch?v=", "embed/")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} allowFullScreen />
              </div>
            ) : null}
          </div>
        )
      );
    }
    const socials = [
      liveMember.socialFb ? { label: "Facebook", color: "#1877F2" } : null,
      liveMember.socialIg ? { label: "Instagram", color: "#E1306C" } : null,
      liveMember.socialYt ? { label: "YouTube", color: "#FF0000" } : null,
      liveMember.socialLi ? { label: "LinkedIn", color: "#0A66C2" } : null,
    ].filter(Boolean);
    if (socials.length) rows.push(card("Social Media", <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>{socials.map((item) => <button key={item.label} type="button" style={{ borderRadius: 12, border: "none", background: item.color, color: "#FFFFFF", padding: 10, fontWeight: 700 }}>{item.label}</button>)}</div>));
    if (user) {
      rows.push(card("Rate This Leader", <div><div style={{ marginBottom: 10 }}>{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setStar(value)} style={{ border: "none", background: "transparent", fontSize: 24, color: value <= star ? "#F59E0B" : "#D1D5DB", cursor: "pointer" }}>★</button>)}</div><button type="button" onClick={() => setRated(true)} style={{ border: "none", borderRadius: 12, background: color, color: "#FFFFFF", padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}>Submit</button>{rated ? <p style={{ color: "#10B981" }}>Thank you!</p> : null}</div>));
    } else {
      rows.push(card("Rate This Leader", <button type="button" onClick={onAuthRequired} style={{ border: "none", borderRadius: 12, background: color, color: "#FFFFFF", padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}>Login to Rate</button>));
    }
    return rows.length ? rows : <p style={{ color: "var(--color-muted)" }}>No profile details yet.</p>;
  }

  function renderBook() {
    if (liveMember.plan !== "elite") return <div style={{ textAlign: "center", color: "var(--color-muted)", padding: 30, background: "#FFFFFF", borderRadius: 14 }}>🔒 Booking available for Elite members only</div>;
    return (
      <div style={{ background: "#FFFFFF", borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {SLOT_DAYS.map((day, index) => <button key={day.label} type="button" onClick={() => setActiveDay(index)} style={{ borderRadius: 999, border: "none", background: activeDay === index ? color : "#EEF2FF", color: activeDay === index ? "#FFFFFF" : "var(--color-text)", padding: "8px 12px", fontWeight: 700 }}>{day.label}</button>)}
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {SLOT_DAYS[activeDay].slots.map((slot) => (
            <div key={slot.id} style={{ borderRadius: 12, border: "1px solid var(--color-border)", padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center", background: slot.booked ? "#F3F4F6" : "#ECFDF5" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{slot.time}</div>
                <div style={{ fontSize: 12, color: "var(--color-muted)" }}>{slot.type}</div>
              </div>
              <button type="button" disabled={slot.booked} onClick={() => onBook(slot)} style={{ borderRadius: 999, border: "none", background: slot.booked ? "#D1D5DB" : color, color: "#FFFFFF", padding: "8px 12px", fontWeight: 700 }}>
                {slot.booked ? "Booked" : "Book"}
              </button>
            </div>
          ))}
        </div>
        <input value={bookingName} onChange={(event) => setBookingName(event.target.value)} placeholder="Your Name" style={{ width: "100%", marginTop: 12, border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px", fontFamily: "Inter, sans-serif" }} />
        {bookingStatus ? <p style={{ color: "var(--color-muted)" }}>{bookingStatus}</p> : null}
      </div>
    );
  }

  function renderContent() {
    if (activeTab === "about") return renderAbout();
    if (activeTab === "gallery") {
      if (!galleryPhotoUrls.length) {
        return <div style={{ textAlign: "center", color: "var(--color-muted)", padding: 20 }}>No photos yet</div>;
      }
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          {galleryPhotoUrls.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              onClick={() => setLightbox(url)}
              style={{
                position: "relative",
                width: "100%",
                padding: 0,
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                overflow: "hidden",
                background: "#F3F4F6",
                aspectRatio: "1 / 1",
                cursor: "pointer",
                minHeight: 0,
              }}
            >
              <img
                src={url}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </button>
          ))}
        </div>
      );
    }
    if (activeTab === "services") return services.length ? services.map((item, index) => card(item.name || `Service ${index + 1}`, <div><p style={{ color: "var(--color-muted)" }}>{item.description || "MLM growth support and mentorship."}</p><button type="button" onClick={openWa} style={{ border: "none", borderRadius: 999, background: color, color: "#FFFFFF", padding: "8px 12px", fontWeight: 700 }}>Enquire</button></div>)) : <div style={{ textAlign: "center", color: "var(--color-muted)", padding: 20 }}>No services listed yet</div>;
    if (activeTab === "events") return events.length ? events.map((item, index) => card(item.title || `Event ${index + 1}`, <p style={{ margin: 0, color: "var(--color-muted)" }}>{item.date || "Date TBA"} · {item.time || "Time TBA"}</p>)) : <div style={{ textAlign: "center", color: "var(--color-muted)", padding: 20 }}>No upcoming events</div>;
    if (activeTab === "join us") return card(`Join ${liveMember.name}'s Team`, <form onSubmit={onJoinSubmit} style={{ display: "grid", gap: 10 }}><input required value={joinForm.name} onChange={(event) => setJoinForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Full Name" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px", fontFamily: "Inter, sans-serif" }} /><input required value={joinForm.wa} onChange={(event) => setJoinForm((prev) => ({ ...prev, wa: event.target.value }))} placeholder="WhatsApp Number" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px", fontFamily: "Inter, sans-serif" }} /><input required value={joinForm.city} onChange={(event) => setJoinForm((prev) => ({ ...prev, city: event.target.value }))} placeholder="Your City" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px", fontFamily: "Inter, sans-serif" }} /><select value={joinForm.experience} onChange={(event) => setJoinForm((prev) => ({ ...prev, experience: event.target.value }))} style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px", fontFamily: "Inter, sans-serif" }}><option>No experience</option><option>1-2 years</option><option>3-5 years</option><option>5+ years</option></select><button type="submit" style={{ border: "none", borderRadius: 12, background: color, color: "#FFFFFF", padding: "10px 14px", fontWeight: 700 }}>Submit</button>{joinStatus ? <p style={{ margin: 0, color: "var(--color-muted)" }}>{joinStatus}</p> : null}</form>);
    if (activeTab === "team") return team.length ? <div style={{ display: "grid", gap: 10 }}>{team.map((item, index) => <div key={`${item.name}-${index}`} style={{ background: "#FFFFFF", borderRadius: 14, padding: 12, display: "flex", gap: 10 }}><div style={{ width: 40, height: 40, borderRadius: "50%", background: `${color}22`, display: "grid", placeItems: "center", color }}>{String(item.name || "TM").slice(0, 2).toUpperCase()}</div><div><div style={{ fontWeight: 700 }}>{item.name}</div><div style={{ fontSize: 12, color: "var(--color-muted)" }}>{item.city} · {item.role}</div></div></div>)}</div> : <div style={{ textAlign: "center", color: "var(--color-muted)", padding: 20 }}>No team members listed</div>;
    return renderBook();
  }

  if (!member) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
        <div style={{ textAlign: "center" }}>
          <h2>Profile unavailable</h2>
          <button type="button" onClick={onBack} style={{ border: "none", borderRadius: 999, background: "var(--color-primary)", color: "#FFFFFF", padding: "10px 16px", fontWeight: 700 }}>Back</button>
        </div>
      </main>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onUploadPhoto} />
      <header style={{ background: `linear-gradient(135deg, ${color}, #312E81)`, padding: "14px 16px 24px", color: "#FFFFFF" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <button type="button" onClick={onBack} style={{ border: "none", borderRadius: 999, padding: "8px 12px", background: "rgba(255,255,255,0.2)", color: "#FFFFFF", fontWeight: 700 }}>← Back</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setShowShare(true)} style={{ border: "none", borderRadius: 999, padding: "8px 12px", background: "rgba(255,255,255,0.2)", color: "#FFFFFF", fontWeight: 700 }}>↗ Share</button>
            <button type="button" onClick={() => setShowQr(true)} style={{ border: "none", borderRadius: 999, padding: "8px 12px", background: "rgba(255,255,255,0.2)", color: "#FFFFFF", fontWeight: 700 }}>⬛ QR</button>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 120, height: 120, margin: "0 auto", position: "relative" }}>
            {liveMember.avatarUrl ? <img src={liveMember.avatarUrl} alt={liveMember.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: "4px solid #FFFFFF", boxShadow: "0 10px 30px rgba(0,0,0,0.25)" }} /> : <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "rgba(255,255,255,0.22)", border: "4px solid #FFFFFF", boxShadow: "0 10px 30px rgba(0,0,0,0.25)", display: "grid", placeItems: "center", fontSize: 42, fontWeight: 800 }}>{String(liveMember.initials || "ML").slice(0, 2).toUpperCase()}</div>}
            {canEdit ? (
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                style={{
                  position: "absolute",
                  right: 4,
                  bottom: 4,
                  border: "none",
                  borderRadius: "50%",
                  width: 34,
                  height: 34,
                  background: uploading ? "#E5E7EB" : "#FFFFFF",
                  cursor: uploading ? "default" : "pointer",
                }}
              >
                📷
              </button>
            ) : null}
          </div>
          {uploading || avatarUploadStatus ? (
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: uploading ? "#FFFFFF" : avatarUploadStatus.startsWith("✅") ? "#86EFAC" : "#FCA5A5",
              }}
            >
              {uploading ? (
                <>
                  <span
                    className="spinner"
                    style={{
                      display: "inline-block",
                      width: 14,
                      height: 14,
                      border: "2px solid rgba(255,255,255,0.35)",
                      borderTopColor: "#FFFFFF",
                      borderRadius: "50%",
                    }}
                    aria-hidden
                  />
                  Uploading...
                </>
              ) : (
                avatarUploadStatus
              )}
            </div>
          ) : null}
          <h1 style={{ margin: "12px 0 4px", fontSize: 28 }}>{liveMember.name} {liveMember.verified ? "✓" : ""}</h1>
          <div style={{ fontSize: 15 }}>{liveMember.role} · {liveMember.company}</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>📍 {liveMember.city}, {liveMember.country}</div>
          <div style={{ fontSize: 40, fontWeight: 800, marginTop: 12 }}>{followers.toLocaleString()}</div>
          <div>Followers</div>
          <div style={{ marginTop: 8 }}>⭐ {liveMember.rating || 0} ({liveMember.reviews || 0})</div>
          <button type="button" onClick={onProfileFollow} style={{ marginTop: 12, borderRadius: 999, border: "1px solid rgba(255,255,255,0.8)", background: "transparent", color: "#FFFFFF", padding: "10px 16px", fontWeight: 700 }}>
            {isFollowing(liveMember.id) ? "Following ✓" : "Follow"}
          </button>
        </div>
      </header>
      <section style={{ position: "sticky", top: 0, zIndex: 20, background: "#F7F8FC", borderBottom: "1px solid var(--color-border)" }}>
        <div className="no-scrollbar" style={{ overflowX: "auto", display: "flex", gap: 2, padding: "0 8px" }}>
          {TABS.map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} style={{ border: "none", background: "transparent", padding: "12px 10px", fontWeight: activeTab === tab ? 800 : 600, color: activeTab === tab ? "var(--color-text)" : "var(--color-muted)", borderBottom: activeTab === tab ? `3px solid ${color}` : "3px solid transparent", textTransform: "capitalize", whiteSpace: "nowrap" }}>
              {tab}
            </button>
          ))}
        </div>
      </section>
      <main style={{ padding: "12px 16px 110px" }}>{renderContent()}</main>
      <footer style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30, borderTop: "1px solid var(--color-border)", background: "#FFFFFF", display: "flex", gap: 8, padding: "10px 12px calc(10px + var(--safe-bottom))" }}>
        <button type="button" onClick={() => onOpenChat(liveMember)} style={{ flex: 1, borderRadius: 999, border: "1px solid var(--color-border)", background: "#FFFFFF", color: "var(--color-muted)", fontWeight: 700, padding: "12px 10px" }}>💬 Message</button>
        <button type="button" onClick={() => setActiveTab(liveMember.plan === "elite" ? "book" : "join us")} style={{ flex: 2, borderRadius: 999, border: "none", background: color, color: "#FFFFFF", fontWeight: 800, padding: "12px 10px" }}>
          {liveMember.plan === "elite" ? "📅 Book Appointment" : "🎯 Join My Team"}
        </button>
      </footer>
      {showShare ? <ShareSheet open={showShare} onClose={() => setShowShare(false)} member={{ ...liveMember, teamSize: liveMember.teamSize || "-" }} /> : null}
      {showQr ? <QRCodeModal open={showQr} onClose={() => setShowQr(false)} member={liveMember} /> : null}
      {lightbox ? (
        <div
          role="presentation"
          onClick={() => setLightbox("")}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.9)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            cursor: "pointer",
          }}
        >
          {/^https?:\/\//i.test(lightbox) ? (
            <img
              src={lightbox}
              alt=""
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain", borderRadius: 8, cursor: "default" }}
            />
          ) : (
            <div style={{ textAlign: "center", color: "#FFFFFF" }}>
              <div style={{ fontSize: 60 }}>📸</div>
              <div>{lightbox}</div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default MemberProfile;

