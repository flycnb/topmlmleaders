import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import MemberCard from "../components/MemberCard";
import { applyMemberSearch, mapMembers, SEARCH_FILTERS } from "../features/search";
import { useNotifications } from "../features/notifications/useNotifications";

const FALLBACK_MEMBERS = [
  { id: "f-1", name: "Rajnish Kumar", city: "Mumbai", country: "India", company: "Herbalife", role: "Diamond Leader", plan: "elite", yearsExp: 15, followerCount: 1240, color: "#6C63FF", initials: "RK", rating: 4.9, reviews: 124, wa: "919876500001", waVisibility: "public", verified: true, slots: 3 },
  { id: "f-2", name: "Priya Sharma", city: "Delhi", country: "India", company: "Amway", role: "Platinum Director", plan: "pro", yearsExp: 10, followerCount: 940, color: "#D4537E", initials: "PS", rating: 4.7, reviews: 89, wa: "919810000001", waVisibility: "public", verified: true, slots: 0 },
  { id: "f-3", name: "Sunita Verma", city: "Pune", country: "India", company: "Modicare", role: "Star Director", plan: "elite", yearsExp: 12, followerCount: 1630, color: "#BA7517", initials: "SV", rating: 4.9, reviews: 203, wa: "919552000003", waVisibility: "public", verified: true, slots: 5 },
  { id: "f-4", name: "Ravi Mehta", city: "Bangalore", country: "India", company: "Mi Lifestyle", role: "Crown Ambassador", plan: "elite", yearsExp: 11, followerCount: 1490, color: "#185FA5", initials: "RM", rating: 4.8, reviews: 178, wa: "919844000004", waVisibility: "public", verified: true, slots: 2 },
  { id: "f-5", name: "Amit Patel", city: "Ahmedabad", country: "India", company: "Forever Living", role: "Senior Manager", plan: "free", yearsExp: 8, followerCount: 420, color: "#1D9E75", initials: "AP", rating: 4.2, reviews: 56, wa: "919714000002", waVisibility: "private", verified: false, slots: 0 },
  { id: "f-6", name: "Deepa Nair", city: "Chennai", country: "India", company: "Vestige", role: "Director", plan: "free", yearsExp: 6, followerCount: 380, color: "#993C1D", initials: "DN", rating: 4.3, reviews: 67, wa: "919000000006", waVisibility: "private", verified: false, slots: 0 },
];

function sortMembers(members) {
  const rank = { elite: 1, pro: 2, company: 3, free: 4 };
  return [...members].sort((a, b) => {
    const aRank = rank[a.plan] || 5;
    const bRank = rank[b.plan] || 5;
    if (aRank !== bRank) return aRank - bRank;
    return (b.followerCount || 0) - (a.followerCount || 0);
  });
}

function SkeletonCard({ id }) {
  return (
    <div key={id} className="pulse" style={{ background: "#FFFFFF", borderRadius: 20, border: "1px solid var(--color-border)", overflow: "hidden" }}>
      <div style={{ height: 60, background: "#EEF2FF" }} />
      <div style={{ padding: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#E5E7EB", marginTop: -28, marginBottom: 10 }} />
        <div style={{ height: 14, background: "#E5E7EB", borderRadius: 8, marginBottom: 8 }} />
        <div style={{ height: 12, width: "75%", background: "#E5E7EB", borderRadius: 8, marginBottom: 8 }} />
        <div style={{ height: 12, width: "60%", background: "#E5E7EB", borderRadius: 8 }} />
      </div>
    </div>
  );
}

function Home({
  user,
  onSignOut,
  onAuthRequired,
  isFollowing,
  toggleFollow,
  isBookmarked,
  toggleBookmark,
  onFlagMember,
  onOpenChat,
  onOpenDashboard,
  onOpenProfile,
}) {
  const [activeTab, setActiveTab] = useState("directory");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState(null);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(12);
  const [columns, setColumns] = useState(1);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);
  const {
    notifications,
    unreadCount,
    markAllRead,
    markOneRead,
    loading: notificationsLoading,
  } = useNotifications(user);

  function timeAgo(value) {
    const timestamp = new Date(value).getTime();
    const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} mins ago`;
    const hours = Math.floor(diffMinutes / 60);
    if (hours < 24) return `${hours} hrs ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  }

  useEffect(() => {
    let canceled = false;
    async function loadMembers() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("follower_count", { ascending: false, nullsFirst: false });
      if (canceled) return;
      if (error || !data?.length) {
        setMembers(sortMembers(FALLBACK_MEMBERS));
      } else {
        const mapped = mapMembers(data).map((member, index) => ({
          ...member,
          socialFb: Boolean(data[index]?.social_fb),
          socialIg: Boolean(data[index]?.social_ig),
          socialYt: Boolean(data[index]?.social_yt),
          socialLi: Boolean(data[index]?.social_li),
        }));
        setMembers(sortMembers(mapped));
      }
      setIsLoading(false);
    }
    loadMembers();
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((response) => response.json())
      .then((data) => {
        if (data?.city && data?.country_name) setLocationFilter({ city: data.city, country: data.country_name });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1200) setColumns(3);
      else if (window.innerWidth >= 768) setColumns(2);
      else setColumns(1);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const filteredMembers = useMemo(
    () => applyMemberSearch(members, searchTerm, activeFilter, locationFilter),
    [members, searchTerm, activeFilter, locationFilter]
  );
  const visibleMembers = useMemo(() => filteredMembers.slice(0, visibleCount), [filteredMembers, visibleCount]);

  useEffect(() => {
    function onScroll() {
      if (isLoading || activeTab !== "directory") return;
      if (window.innerHeight + window.scrollY + 100 < document.body.offsetHeight) return;
      setVisibleCount((prev) => Math.min(prev + 12, filteredMembers.length));
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [filteredMembers.length, isLoading, activeTab]);

  useEffect(() => {
    setVisibleCount(12);
  }, [searchTerm, activeFilter, locationFilter]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    if (showUserMenu || showNotifications) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showUserMenu, showNotifications]);

  function handleFollow(memberId) {
    const member = members.find((item) => item.id === memberId);
    if (!member) return;
    toggleFollow(member, (delta) => {
      setMembers((prev) =>
        prev.map((item) =>
          item.id === memberId
            ? { ...item, followerCount: Math.max(0, (item.followerCount || 0) + delta) }
            : item
        )
      );
    });
  }

  function renderDirectory() {
    return (
      <>
        <section style={{ margin: "12px 16px 0", borderRadius: 24, padding: "26px 16px", background: "linear-gradient(135deg, #4F46E5, #312E81)" }}>
          <h2 style={{ color: "#FFFFFF", fontSize: 32, margin: 0, fontWeight: 800, lineHeight: 1.1 }}>Find MLM Leaders Worldwide</h2>
          <p style={{ color: "rgba(255,255,255,0.92)", marginTop: 10, fontSize: 15 }}>AI Powered Search · Connect · Grow Worldwide</p>
          <div style={{ marginTop: 16, background: "#FFFFFF", borderRadius: 999, minHeight: 52, display: "flex", alignItems: "center", padding: "6px 6px 6px 14px", gap: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
            <span>🔍</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, city, company, role, country..."
              style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontFamily: "Inter, sans-serif" }}
            />
            <button type="button" style={{ borderRadius: 999, border: "none", background: "#6C63FF", color: "#FFFFFF", fontWeight: 700, padding: "8px 11px", cursor: "pointer" }}>🧠</button>
            <button type="button" style={{ borderRadius: 999, border: "none", background: "#6C63FF", color: "#FFFFFF", fontWeight: 700, padding: "8px 14px", cursor: "pointer" }}>Search</button>
          </div>
          <div className="no-scrollbar" style={{ marginTop: 12, display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
            {SEARCH_FILTERS.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  style={{
                    borderRadius: 999,
                    border: isActive ? "none" : "1px solid rgba(255,255,255,0.5)",
                    background: isActive ? "var(--color-primary)" : "#FFFFFF",
                    color: isActive ? "#FFFFFF" : "var(--color-muted)",
                    fontWeight: 700,
                    padding: "7px 12px",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    textTransform: filter === "all" ? "none" : "capitalize",
                  }}
                >
                  {filter}
                </button>
              );
            })}
            {locationFilter ? (
              <button type="button" onClick={() => setLocationFilter(null)} style={{ borderRadius: 999, border: "none", background: "#FFFFFF", color: "#111827", fontWeight: 700, padding: "7px 12px", whiteSpace: "nowrap", cursor: "pointer" }}>
                📍 {locationFilter.city}, {locationFilter.country} ×
              </button>
            ) : null}
          </div>
        </section>

        <section style={{ padding: "18px 16px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <strong style={{ fontSize: 15, color: "var(--color-text)" }}>{filteredMembers.length} leaders found</strong>
            <span style={{ fontSize: 12, color: "var(--color-muted)" }}>Elite first → by followers</span>
          </div>
          {isLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 20 }}>
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonCard key={`sk-${index}`} id={index} />
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div style={{ borderRadius: 20, background: "#FFFFFF", border: "1px solid var(--color-border)", textAlign: "center", padding: "36px 16px" }}>
              <div style={{ fontSize: 44 }}>🔍</div>
              <h3 style={{ margin: "10px 0 6px" }}>No leaders found</h3>
              <p style={{ margin: 0, color: "var(--color-muted)" }}>Try a different search term</p>
              <button type="button" onClick={() => setSearchTerm("")} style={{ marginTop: 16, border: "none", borderRadius: 999, background: "var(--color-primary)", color: "#FFFFFF", fontWeight: 700, padding: "9px 16px", cursor: "pointer" }}>
                Clear search
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 20 }}>
                {visibleMembers.map((member) => (
                  <div key={member.id} style={{ display: "grid", gap: 8 }}>
                    <MemberCard
                      member={member}
                      isLoggedIn={Boolean(user)}
                      isFollowing={isFollowing(member.id)}
                      onFollow={handleFollow}
                      onBlockedAction={onAuthRequired}
                      onViewProfile={() => onOpenProfile(member)}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => toggleBookmark(member)} style={{ flex: 1, borderRadius: 999, border: "1px solid var(--color-border)", background: "#FFFFFF", padding: "8px 10px", fontWeight: 700, cursor: "pointer" }}>
                        {isBookmarked(member.id) ? "🔖 Bookmarked" : "🔖 Bookmark"}
                      </button>
                      <button type="button" onClick={() => onOpenChat(member)} style={{ borderRadius: 999, border: "1px solid #DBEAFE", background: "#FFFFFF", color: "#1D4ED8", padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>
                        ✉️ Chat
                      </button>
                      <button type="button" onClick={() => (user ? onFlagMember(member) : onAuthRequired())} style={{ borderRadius: 999, border: "1px solid #FECACA", background: "#FFFFFF", color: "#DC2626", padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>
                        🚩 Flag
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {visibleMembers.length < filteredMembers.length ? (
                <div style={{ padding: 18, textAlign: "center", color: "var(--color-muted)" }}>
                  <span className="spinner" style={{ display: "inline-block" }}>⏳</span> Loading more leaders...
                </div>
              ) : (
                <div style={{ padding: 18, textAlign: "center", color: "var(--color-muted)" }}>All leaders loaded</div>
              )}
            </>
          )}
        </section>
      </>
    );
  }

  function renderPlaceholder(text) {
    return <section style={{ minHeight: "60vh", display: "grid", placeItems: "center", textAlign: "center", padding: "0 20px 24px" }}><h2 style={{ margin: 0, color: "var(--color-muted)", fontWeight: 700 }}>{text}</h2></section>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#FFFFFF", borderBottom: "1px solid var(--color-border)", padding: "10px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab("directory");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            style={{ border: "none", background: "transparent", textAlign: "left", cursor: "pointer", padding: 0 }}
          >
            <div style={{ fontWeight: 800, color: "var(--color-primary)", fontSize: 20 }}>🌐 TopMLMLeaders</div>
            <div style={{ fontSize: 12, color: "var(--color-muted)" }}>AI Powered Search · Connect · Grow Worldwide</div>
          </button>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setActiveTab("top")} style={{ border: "1px solid var(--color-border)", borderRadius: 999, background: "#FFFFFF", padding: "7px 10px", color: "var(--color-text)", fontWeight: 700, cursor: "pointer" }}>
              🏆 Top
            </button>
            <button type="button" onClick={() => setActiveTab("board")} style={{ border: "1px solid var(--color-border)", borderRadius: 999, background: "#FFFFFF", padding: "7px 10px", color: "var(--color-text)", fontWeight: 700, cursor: "pointer" }}>
              📋 Board
            </button>
            <button type="button" onClick={() => setActiveTab("plans")} style={{ border: "none", borderRadius: 999, background: "#F59E0B", color: "#FFFFFF", padding: "7px 10px", fontWeight: 700, cursor: "pointer" }}>
              💎 Plans
            </button>
            {user ? (
              <div ref={notifRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setShowNotifications((prev) => !prev)}
                  style={{ border: "1px solid var(--color-border)", borderRadius: 999, background: "#FFFFFF", padding: "7px 10px", color: "var(--color-muted)", fontWeight: 700, cursor: "pointer" }}
                >
                  🔔 {unreadCount}
                </button>
                {showNotifications ? (
                  <div
                    className="fade-in"
                    style={{
                      position: "fixed",
                      top: 76,
                      right: 16,
                      width: "min(360px, calc(100vw - 32px))",
                      maxHeight: "70vh",
                      overflowY: "auto",
                      background: "#FFFFFF",
                      border: "1px solid var(--color-border)",
                      borderRadius: 14,
                      boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
                      zIndex: 80,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 12px 8px" }}>
                      <strong>Notifications</strong>
                      <button
                        type="button"
                        onClick={markAllRead}
                        style={{ border: "none", background: "transparent", color: "var(--color-primary)", fontWeight: 700, cursor: "pointer" }}
                      >
                        Mark all read
                      </button>
                    </div>
                    <div style={{ padding: 10, display: "grid", gap: 8 }}>
                      {notificationsLoading ? (
                        <div style={{ color: "var(--color-muted)", textAlign: "center", padding: 10 }}>Loading...</div>
                      ) : notifications.length === 0 ? (
                        <div style={{ color: "var(--color-muted)", textAlign: "center", padding: 14 }}>No notifications yet</div>
                      ) : (
                        notifications.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={async () => {
                              await markOneRead(item.id);
                              setShowNotifications(false);
                            }}
                            style={{
                              textAlign: "left",
                              border: "1px solid var(--color-border)",
                              borderRadius: 10,
                              background: item.read ? "#FFFFFF" : "#F5F3FF",
                              padding: 10,
                              cursor: "pointer",
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>
                              {item.type === "message" ? "💬" : "👥"} {item.text}
                            </div>
                            <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-muted)" }}>
                              {timeAgo(item.created_at)}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {user ? (
              <div ref={userMenuRef} style={{ position: "relative" }}>
                <button type="button" onClick={() => setShowUserMenu((prev) => !prev)} style={{ border: "none", borderRadius: 999, background: "var(--color-primary)", color: "#FFFFFF", padding: "7px 12px", fontWeight: 700, cursor: "pointer" }}>👤 {String(user?.name || "Me").split(" ")[0]}</button>
                {showUserMenu ? (
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 190, background: "#FFFFFF", border: "1px solid var(--color-border)", borderRadius: 12, boxShadow: "0 12px 28px rgba(0,0,0,0.12)", padding: 8, zIndex: 60 }}>
                    <button type="button" onClick={() => { setShowUserMenu(false); onOpenDashboard(); }} style={{ width: "100%", textAlign: "left", border: "none", background: "transparent", borderRadius: 8, padding: "10px 8px", fontWeight: 600, cursor: "pointer" }}>
                      👤 Open Dashboard
                    </button>
                    <button type="button" onClick={() => { setShowUserMenu(false); onSignOut(); }} style={{ width: "100%", textAlign: "left", border: "none", background: "transparent", borderRadius: 8, padding: "10px 8px", fontWeight: 600, cursor: "pointer" }}>
                      🚪 Logout
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <button type="button" onClick={onAuthRequired} style={{ border: "none", borderRadius: 999, background: "var(--color-primary)", color: "#FFFFFF", padding: "7px 12px", fontWeight: 700, cursor: "pointer" }}>Login</button>
            )}
          </div>
        </div>
      </header>
      {activeTab === "directory" && renderDirectory()}
      {activeTab === "top" && renderPlaceholder("🏆 Leaderboard coming soon")}
      {activeTab === "board" && renderPlaceholder("📋 Opportunity Board coming soon")}
      {activeTab === "plans" && renderPlaceholder("💎 Plans coming soon")}
    </div>
  );
}

export default Home;
