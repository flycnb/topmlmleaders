import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import ShareSheet from "../../components/ShareSheet";
import QRCodeModal from "../../components/QRCode";

const TABS = ["about", "gallery", "services", "events", "join us", "team", "book"];
const SLOT_DAYS = [
  {
    label: "Today",
    slots: [
      { id: "t-1", time: "6:00 PM", type: "Call", booked: false },
      { id: "t-2", time: "8:00 PM", type: "WA Video", booked: true },
    ],
  },
  {
    label: "Tomorrow",
    slots: [
      { id: "n-1", time: "4:00 PM", type: "WA Video", booked: false },
      { id: "n-2", time: "7:30 PM", type: "In-Person", booked: false },
    ],
  },
];

function isVisible(visibility, isLoggedIn) {
  if (visibility === "public") return true;
  if (visibility === "private") return false;
  return isLoggedIn;
}

function card(title, content) {
  return (
    <section style={{ background: "#FFFFFF", borderRadius: 14, boxShadow: "var(--shadow-card)", padding: 14, marginBottom: 12 }}>
      <h3 style={{ margin: "0 0 10px", color: "var(--color-primary)", fontSize: 16 }}>{title}</h3>
      {content}
    </section>
  );
}

function MemberProfile({ member, onBack }) {
  const safeMember = member || {};
  const [currentUser, setCurrentUser] = useState(null);
  const [liveMember, setLiveMember] = useState(safeMember);
  const [showShare, setShowShare] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [activeTab, setActiveTab] = useState("about");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState(Number(safeMember?.followerCount || 0));
  const [uploading, setUploading] = useState(false);
  const [youtubeInput, setYoutubeInput] = useState(safeMember?.youtubeUrl || "");
  const [star, setStar] = useState(0);
  const [rated, setRated] = useState(false);
  const [joinForm, setJoinForm] = useState({ name: "", wa: "", city: "", experience: "No experience" });
  const [joinStatus, setJoinStatus] = useState("");
  const [bookingName, setBookingName] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [activeDay, setActiveDay] = useState(0);
  const [lightbox, setLightbox] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    const nextMember = member || {};
    setLiveMember(nextMember);
    setFollowers(Number(nextMember?.followerCount || 0));
    setYoutubeInput(nextMember?.youtubeUrl || "");
  }, [member]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const user = data?.session?.user || null;
      setCurrentUser(user);
      if (user) setBookingName(user.user_metadata?.full_name || "");
    });
    return () => {
      mounted = false;
    };
  }, []);

  const canEdit = Boolean(currentUser && currentUser.id === liveMember?.ownerId);
  const color = liveMember?.color || "#6C63FF";
  const phoneAllowed = isVisible(liveMember?.phoneVisibility || "private", Boolean(currentUser));
  const waAllowed = isVisible(liveMember?.waVisibility || "private", Boolean(currentUser));
  const gallery = Array.isArray(liveMember?.gallery) ? liveMember.gallery : [];
  const services = Array.isArray(liveMember?.services) ? liveMember.services : [];
  const events = Array.isArray(liveMember?.events) ? liveMember.events : [];
  const team = Array.isArray(liveMember?.team) ? liveMember.team : [];
  async function onUploadPhoto(event) {
    const file = event.target.files?.[0];
    if (!file || !canEdit || !liveMember?.id) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${liveMember.id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(false);
      return;
    }
    const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const { error: updateError } = await supabase.from("members").update({ avatar_url: publicUrl }).eq("id", liveMember.id);
    setUploading(false);
    if (!updateError) setLiveMember((prev) => ({ ...prev, avatarUrl: publicUrl }));
  }

  async function onSaveYoutube() {
    if (!canEdit || !liveMember?.id) return;
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
    if (!currentUser) {
      setBookingStatus("Please login to book.");
      return;
    }
    setBookingStatus("Saving booking...");
    const { error } = await supabase.from("bookings").insert({
      member_id: liveMember.id,
      booker_id: currentUser.id,
      booker_name: bookingName || "Member",
      slot_day: SLOT_DAYS[activeDay].label,
      slot_time: slot.time,
      slot_type: slot.type,
      status: "pending",
    });
    if (error) setBookingStatus("Could not save booking.");
    else setBookingStatus("Booking requested successfully.");
  }

  function openWa() {
    if (!waAllowed || !liveMember?.wa) return;
    window.open(`https://wa.me/${String(liveMember.wa).replace(/[^\d]/g, "")}`, "_blank", "noopener");
  }

  function renderAbout() {
    const blocks = [];
    if (liveMember?.description) {
      blocks.push(card("About Me", <p style={{ margin: 0, lineHeight: 1.7, fontSize: 14 }}>{liveMember.description}</p>));
    }
    if (phoneAllowed || waAllowed) {
      blocks.push(
        card(
          "Contact",
          <div style={{ display: "grid", gap: 10 }}>
            {phoneAllowed ? (
              <button type="button" style={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "#FFFFFF", padding: 10, fontWeight: 700, cursor: "pointer" }}>
                📞 Call
              </button>
            ) : null}
            {waAllowed ? (
              <button type="button" onClick={openWa} style={{ borderRadius: 12, border: "none", background: "#10B981", color: "#FFFFFF", padding: 10, fontWeight: 700, cursor: "pointer" }}>
                💬 WhatsApp
              </button>
            ) : null}
          </div>
        )
      );
    }
    if (canEdit || liveMember?.youtubeUrl) {
      blocks.push(
        card(
          "My Video",
          <div>
            {canEdit ? (
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input value={youtubeInput} onChange={(event) => setYoutubeInput(event.target.value)} placeholder="Paste YouTube URL" style={{ flex: 1, border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px", fontFamily: "Inter, sans-serif" }} />
                <button type="button" onClick={onSaveYoutube} style={{ borderRadius: 10, border: "none", background: color, color: "#FFFFFF", padding: "0 12px", fontWeight: 700, cursor: "pointer" }}>
                  Save
                </button>
              </div>
            ) : null}
            {liveMember?.youtubeUrl ? (
              <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: 12, overflow: "hidden" }}>
                <iframe title="YouTube video" src={liveMember.youtubeUrl.replace("watch?v=", "embed/")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} allowFullScreen />
              </div>
            ) : null}
          </div>
        )
      );
    }
    const social = [
      liveMember?.socialFb ? { label: "Facebook", color: "#1877F2" } : null,
      liveMember?.socialIg ? { label: "Instagram", color: "#E1306C" } : null,
      liveMember?.socialYt ? { label: "YouTube", color: "#FF0000" } : null,
      liveMember?.socialLi ? { label: "LinkedIn", color: "#0A66C2" } : null,
    ].filter(Boolean);
    if (social.length) {
      blocks.push(
        card(
          "Social Media",
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {social.map((item) => (
              <button key={item.label} type="button" style={{ borderRadius: 12, border: "none", background: item.color, color: "#FFFFFF", padding: 10, fontWeight: 700, cursor: "pointer" }}>
                {item.label}
              </button>
            ))}
          </div>
        )
      );
    }
    if (currentUser) {
      blocks.push(
        card(
          "Rate This Leader",
          <div>
            <div style={{ marginBottom: 10 }}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" onClick={() => setStar(value)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 24, color: value <= star ? "#F59E0B" : "#D1D5DB" }}>
                  ★
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setRated(true)} style={{ borderRadius: 12, border: "none", background: color, color: "#FFFFFF", padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}>
              Submit
            </button>
            {rated ? <p style={{ color: "#10B981", marginBottom: 0 }}>Thank you!</p> : null}
          </div>
        )
      );
    }
    return blocks.length ? blocks : <p style={{ color: "var(--color-muted)" }}>No profile details yet.</p>;
  }

  function renderGallery() {
    const items = gallery.length ? gallery : [];
    if (!items.length) return <div style={{ textAlign: "center", color: "var(--color-muted)", padding: 20 }}>No photos yet</div>;
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        {items.map((item, index) => (
          <button key={`${item}-${index}`} type="button" onClick={() => setLightbox(item)} style={{ borderRadius: 14, border: "1px solid var(--color-border)", background: "#FFFFFF", padding: 18, cursor: "pointer" }}>
            <div style={{ fontSize: 26 }}>📸</div>
            <div style={{ marginTop: 8, color: "var(--color-muted)", fontSize: 12 }}>{item}</div>
          </button>
        ))}
      </div>
    );
  }

  function renderServices() {
    if (!services.length) return <div style={{ textAlign: "center", color: "var(--color-muted)", padding: 20 }}>No services listed yet</div>;
    return services.map((service, index) =>
      card(
        service.name || `Service ${index + 1}`,
        <div>
          <p style={{ marginTop: 0, color: "var(--color-muted)" }}>{service.description || "MLM growth support and mentorship."}</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>{service.price || "Contact for price"}</strong>
            <button type="button" onClick={openWa} style={{ borderRadius: 999, border: "none", background: color, color: "#FFFFFF", padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>
              Enquire
            </button>
          </div>
        </div>
      )
    );
  }

  function renderEvents() {
    if (!events.length) return <div style={{ textAlign: "center", color: "var(--color-muted)", padding: 20 }}>No upcoming events</div>;
    return events.map((event, index) =>
      card(
        event.title || `Event ${index + 1}`,
        <div>
          <p style={{ margin: "0 0 8px", color: "var(--color-muted)" }}>
            {event.date || "Date TBA"} · {event.time || "Time TBA"} · {event.location || liveMember.city}
          </p>
          <button type="button" style={{ borderRadius: 999, border: "none", background: color, color: "#FFFFFF", padding: "8px 14px", fontWeight: 700, cursor: "pointer" }}>
            Register
          </button>
        </div>
      )
    );
  }

  function renderJoin() {
    return card(
      `Join ${liveMember.name}'s Team`,
      <form onSubmit={onJoinSubmit} style={{ display: "grid", gap: 10 }}>
        <input required value={joinForm.name} onChange={(event) => setJoinForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Full Name" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px", fontFamily: "Inter, sans-serif" }} />
        <input required value={joinForm.wa} onChange={(event) => setJoinForm((prev) => ({ ...prev, wa: event.target.value }))} placeholder="WhatsApp Number" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px", fontFamily: "Inter, sans-serif" }} />
        <input required value={joinForm.city} onChange={(event) => setJoinForm((prev) => ({ ...prev, city: event.target.value }))} placeholder="Your City" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px", fontFamily: "Inter, sans-serif" }} />
        <select value={joinForm.experience} onChange={(event) => setJoinForm((prev) => ({ ...prev, experience: event.target.value }))} style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px", fontFamily: "Inter, sans-serif" }}>
          <option>No experience</option>
          <option>1-2 years</option>
          <option>3-5 years</option>
          <option>5+ years</option>
        </select>
        <button type="submit" style={{ borderRadius: 12, border: "none", background: color, color: "#FFFFFF", padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}>
          Submit
        </button>
        {joinStatus ? <p style={{ margin: 0, color: joinStatus.includes("Success") ? "#10B981" : "var(--color-muted)" }}>{joinStatus}</p> : null}
      </form>
    );
  }

  function renderTeam() {
    if (!team.length) return <div style={{ textAlign: "center", color: "var(--color-muted)", padding: 20 }}>No team members listed</div>;
    return (
      <div style={{ display: "grid", gap: 10 }}>
        {team.map((item, index) => (
          <div key={`${item.name}-${index}`} style={{ background: "#FFFFFF", borderRadius: 14, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${color}22`, color, display: "grid", placeItems: "center", fontWeight: 800 }}>{String(item.name || "TM").slice(0, 2).toUpperCase()}</div>
            <div>
              <div style={{ fontWeight: 700 }}>{item.name}</div>
              <div style={{ fontSize: 12, color: "var(--color-muted)" }}>{item.city} · {item.role}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderBook() {
    if (liveMember?.plan !== "elite") {
      return <div style={{ textAlign: "center", color: "var(--color-muted)", padding: 30, background: "#FFFFFF", borderRadius: 14 }}>🔒 Booking available for Elite members only</div>;
    }
    return (
      <div style={{ background: "#FFFFFF", borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {SLOT_DAYS.map((day, index) => (
            <button key={day.label} type="button" onClick={() => setActiveDay(index)} style={{ borderRadius: 999, border: "none", background: activeDay === index ? color : "#EEF2FF", color: activeDay === index ? "#FFFFFF" : "var(--color-text)", padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>
              {day.label}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {SLOT_DAYS[activeDay].slots.map((slot) => (
            <div key={slot.id} style={{ borderRadius: 12, border: "1px solid var(--color-border)", padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center", background: slot.booked ? "#F3F4F6" : "#ECFDF5" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{slot.time}</div>
                <div style={{ fontSize: 12, color: "var(--color-muted)" }}>{slot.type}</div>
              </div>
              <button type="button" disabled={slot.booked} onClick={() => onBook(slot)} style={{ borderRadius: 999, border: "none", background: slot.booked ? "#D1D5DB" : color, color: "#FFFFFF", padding: "8px 12px", fontWeight: 700, cursor: slot.booked ? "not-allowed" : "pointer" }}>
                {slot.booked ? "Booked" : "Book"}
              </button>
            </div>
          ))}
        </div>
        <input value={bookingName} onChange={(event) => setBookingName(event.target.value)} placeholder="Your Name" style={{ width: "100%", marginTop: 12, border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px", fontFamily: "Inter, sans-serif" }} />
        {bookingStatus ? <p style={{ color: "var(--color-muted)", marginBottom: 0 }}>{bookingStatus}</p> : null}
      </div>
    );
  }

  function renderContent() {
    if (activeTab === "about") return renderAbout();
    if (activeTab === "gallery") return renderGallery();
    if (activeTab === "services") return renderServices();
    if (activeTab === "events") return renderEvents();
    if (activeTab === "join us") return renderJoin();
    if (activeTab === "team") return renderTeam();
    return renderBook();
  }

  if (!member) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
        <div style={{ textAlign: "center" }}>
          <h2>Profile unavailable</h2>
          <button type="button" onClick={onBack} style={{ border: "none", borderRadius: 999, background: "var(--color-primary)", color: "#FFFFFF", fontWeight: 700, padding: "10px 16px", cursor: "pointer" }}>
            Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onUploadPhoto} />
      <header style={{ background: `linear-gradient(135deg, ${color}, #312E81)`, padding: "14px 16px 24px", color: "#FFFFFF" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <button type="button" onClick={onBack} style={{ border: "none", borderRadius: 999, padding: "8px 12px", background: "rgba(255,255,255,0.2)", color: "#FFFFFF", fontWeight: 700, cursor: "pointer" }}>
            ← Back
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setShowShare(true)} style={{ border: "none", borderRadius: 999, padding: "8px 12px", background: "rgba(255,255,255,0.2)", color: "#FFFFFF", fontWeight: 700, cursor: "pointer" }}>
              ↗ Share
            </button>
            <button type="button" onClick={() => setShowQr(true)} style={{ border: "none", borderRadius: 999, padding: "8px 12px", background: "rgba(255,255,255,0.2)", color: "#FFFFFF", fontWeight: 700, cursor: "pointer" }}>
              ⬛ QR
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ width: 120, height: 120, margin: "0 auto", position: "relative" }}>
            {liveMember?.avatarUrl ? (
              <img src={liveMember.avatarUrl} alt={liveMember.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: "4px solid #FFFFFF", boxShadow: "0 10px 30px rgba(0,0,0,0.25)" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "rgba(255,255,255,0.22)", border: "4px solid #FFFFFF", boxShadow: "0 10px 30px rgba(0,0,0,0.25)", display: "grid", placeItems: "center", fontSize: 42, fontWeight: 800 }}>
                {String(liveMember?.initials || "ML").slice(0, 2).toUpperCase()}
              </div>
            )}
            {canEdit ? (
              <button type="button" onClick={() => fileRef.current?.click()} style={{ position: "absolute", right: 4, bottom: 4, border: "none", borderRadius: "50%", width: 34, height: 34, background: "#FFFFFF", cursor: "pointer" }}>
                📷
              </button>
            ) : null}
          </div>
          {uploading ? <div style={{ marginTop: 6 }}>Uploading...</div> : null}
          <h1 style={{ margin: "12px 0 4px", fontSize: 28 }}>{liveMember?.name} {liveMember?.verified ? "✓" : ""}</h1>
          <div style={{ fontSize: 15, opacity: 0.96 }}>{liveMember?.role} · {liveMember?.company}</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>📍 {liveMember?.city}, {liveMember?.country}</div>
          <div style={{ fontSize: 40, fontWeight: 800, marginTop: 12 }}>{followers.toLocaleString()}</div>
          <div style={{ opacity: 0.92 }}>Followers</div>
          <div style={{ marginTop: 8, fontSize: 14 }}>⭐ {liveMember?.rating || 0} ({liveMember?.reviews || 0})</div>
          <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 10, justifyContent: "center" }}>
            <span style={{ background: "rgba(255,255,255,0.22)", borderRadius: 999, padding: "7px 10px", whiteSpace: "nowrap", fontSize: 12 }}>💰 {liveMember?.earnings || "N/A"}</span>
            <span style={{ background: "rgba(255,255,255,0.22)", borderRadius: 999, padding: "7px 10px", whiteSpace: "nowrap", fontSize: 12 }}>👥 {liveMember?.teamSize || "N/A"}</span>
            <span style={{ background: "rgba(255,255,255,0.22)", borderRadius: 999, padding: "7px 10px", whiteSpace: "nowrap", fontSize: 12 }}>{liveMember?.plan === "elite" ? "🌟 Elite" : liveMember?.plan === "pro" ? "💎 Pro" : "🧩 Free"}</span>
          </div>
          <button type="button" onClick={() => { setIsFollowing((prev) => !prev); setFollowers((prev) => Math.max(0, prev + (isFollowing ? -1 : 1))); }} style={{ marginTop: 12, borderRadius: 999, border: "1px solid rgba(255,255,255,0.8)", background: "transparent", color: "#FFFFFF", padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}>
            {isFollowing ? "Following ✓" : "Follow"}
          </button>
        </div>
      </header>

      <section style={{ marginTop: -16, padding: "0 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, boxShadow: "var(--shadow-card)", textAlign: "center", padding: "10px 8px" }}><div>👥</div><div style={{ fontWeight: 800 }}>{liveMember?.teamSize || "-"}</div><div style={{ fontSize: 12, color: "var(--color-muted)" }}>Team size</div></div>
          <div style={{ background: "#FFFFFF", borderRadius: 16, boxShadow: "var(--shadow-card)", textAlign: "center", padding: "10px 8px" }}><div>📅</div><div style={{ fontWeight: 800 }}>{liveMember?.joinedDate || "-"}</div><div style={{ fontSize: 12, color: "var(--color-muted)" }}>Since</div></div>
          <div style={{ background: "#FFFFFF", borderRadius: 16, boxShadow: "var(--shadow-card)", textAlign: "center", padding: "10px 8px" }}><div>💰</div><div style={{ fontWeight: 800 }}>{liveMember?.earnings || "-"}</div><div style={{ fontSize: 12, color: "var(--color-muted)" }}>Earnings</div></div>
        </div>
      </section>

      <section className="no-scrollbar" style={{ padding: "12px 16px 6px", overflowX: "auto", display: "flex", gap: 8 }}>
        {(liveMember?.badges?.length ? liveMember.badges : ["🏆 Top Leader", "🚀 Mentor", "🌍 Global Network"]).map((badge, index) => (
          <span key={`${badge}-${index}`} style={{ background: `${color}1A`, color, borderRadius: 999, padding: "6px 10px", whiteSpace: "nowrap", fontWeight: 700, fontSize: 12 }}>
            {badge}
          </span>
        ))}
      </section>

      <section style={{ position: "sticky", top: 0, zIndex: 20, background: "#F7F8FC", borderBottom: "1px solid var(--color-border)" }}>
        <div className="no-scrollbar" style={{ overflowX: "auto", display: "flex", gap: 2, padding: "0 8px" }}>
          {TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)} style={{ border: "none", background: "transparent", padding: "12px 10px", cursor: "pointer", fontWeight: active ? 800 : 600, color: active ? "var(--color-text)" : "var(--color-muted)", borderBottom: active ? `3px solid ${color}` : "3px solid transparent", textTransform: "capitalize", whiteSpace: "nowrap", transition: "all 0.2s ease" }}>
                {tab}
              </button>
            );
          })}
        </div>
      </section>

      <main style={{ padding: "12px 16px 110px" }}>{renderContent()}</main>

      <footer style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30, borderTop: "1px solid var(--color-border)", background: "#FFFFFF", display: "flex", gap: 8, padding: "10px 12px calc(10px + var(--safe-bottom))" }}>
        <button type="button" style={{ flex: 1, borderRadius: 999, border: "1px solid var(--color-border)", background: "#FFFFFF", color: "var(--color-muted)", fontWeight: 700, padding: "12px 10px", cursor: "pointer" }}>
          💬 Message
        </button>
        <button type="button" onClick={() => setActiveTab(liveMember?.plan === "elite" ? "book" : "join us")} style={{ flex: 2, borderRadius: 999, border: "none", background: color, color: "#FFFFFF", fontWeight: 800, padding: "12px 10px", cursor: "pointer" }}>
          {liveMember?.plan === "elite" ? "📅 Book Appointment" : "🎯 Join My Team"}
        </button>
      </footer>

      {showShare ? <ShareSheet open={showShare} onClose={() => setShowShare(false)} member={{ ...liveMember, teamSize: liveMember?.teamSize || "-" }} /> : null}
      {showQr ? <QRCodeModal open={showQr} onClose={() => setShowQr(false)} member={liveMember} /> : null}
      {lightbox ? (
        <div onClick={() => setLightbox("")} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.85)", display: "grid", placeItems: "center", color: "#FFFFFF" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 60 }}>📸</div>
            <div>{lightbox}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default MemberProfile;
