import React, { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import "./App.css";
import Home from "./pages/Home";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import ProfilePage from "./pages/ProfilePage";
import Dashboard from "./features/dashboard";
import AdminPanel from "./features/admin";
import AuthModal from "./features/auth";
import ChatModal from "./components/ChatModal";
import { useAuth } from "./features/auth/useAuth";
import { useFollow } from "./features/follow/useFollow";
import { useBookmarks } from "./features/bookmarks/useBookmarks";
import { supabase } from "./lib/supabaseClient";
import { PENDING_REF_STORAGE_KEY } from "./lib/referrals";
import { mapMembers } from "./features/search";
import { requestNotificationPermission, onForegroundMessage } from "./lib/firebase";

const ADMIN_EMAIL = process.env.REACT_APP_ADMIN_EMAIL || "";

/** Persist ?ref=slug for signup attribution (Refer & Earn). */
function captureReferralFromUrl() {
  try {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get("ref");
    if (!raw || !String(raw).trim()) return;
    sessionStorage.setItem(PENDING_REF_STORAGE_KEY, String(raw).trim());
    url.searchParams.delete("ref");
    const qs = url.searchParams.toString();
    window.history.replaceState({}, "", `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`);
  } catch {
    /* ignore */
  }
}

function profilePathFromMember(member) {
  if (!member) return "/";
  const slug = member.slug && String(member.slug).trim();
  if (slug) return `/u/${encodeURIComponent(slug)}`;
  return `/u/${encodeURIComponent(member.id)}`;
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAuth, setShowAuth] = useState(false);
  const [chatMember, setChatMember] = useState(null);
  const { user, loading, oauthRedirecting, signingOut, signInWithGoogle, signOut } = useAuth();
  const { isFollowing, toggleFollow } = useFollow(user, () => setShowAuth(true));
  const { isBookmarked, toggleBookmark } = useBookmarks(user, () => setShowAuth(true));
  const hadUserRef = useRef(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      const dismissed = localStorage.getItem("pwa-install-dismissed");
      if (!dismissed) setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(() => {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    });
  }

  function handleDismiss() {
    setShowInstallBanner(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  }

  useEffect(() => {
    captureReferralFromUrl();
  }, [location.pathname, location.search]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("code")) return undefined;

    let cleaned = false;
    function stripOAuthParamsFromUrl() {
      if (cleaned) return;
      const u = new URL(window.location.href);
      if (!u.searchParams.has("code")) {
        cleaned = true;
        return;
      }
      u.searchParams.delete("code");
      u.searchParams.delete("state");
      const qs = u.searchParams.toString();
      window.history.replaceState({}, "", `${u.pathname}${qs ? `?${qs}` : ""}${u.hash}`);
      cleaned = true;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "INITIAL_SESSION" && event !== "SIGNED_IN") return;
      if (!session) return;
      queueMicrotask(stripOAuthParamsFromUrl);
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) queueMicrotask(stripOAuthParamsFromUrl);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (hadUserRef.current && !user?.id) {
      navigate("/", { replace: true });
    }
    hadUserRef.current = Boolean(user?.id);
  }, [user?.id, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    async function setupPush() {
      try {
        const token = await requestNotificationPermission();
        if (!token) return;
        await supabase.from("users")
          .upsert(
            { id: user.id, fcm_token: token },
            { onConflict: "id", ignoreDuplicates: false }
          );
      } catch {
        /* silent — push is optional */
      }
    }
    setupPush();

    const unsub = onForegroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      if (title || body) {
        if (Notification.permission === "granted") {
          new Notification(title || "TopMLMLeaders", {
            body: body || "",
            icon: "/logo192-notify.png",
            badge: "/logo192-notify.png",
          });
        }
      }
    });
    return () => unsub?.();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    function handleHashChat(hash) {
      const h = String(hash || window.location.hash).trim();
      if (!h.startsWith("#/m/")) return;
      const slug = h
        .replace(/^#\/m\//i, "")
        .split("?")[0]
        .split("#")[0]
        .trim();
      if (!slug) return;
      supabase
        .from("members")
        .select("*")
        .or(`slug.eq.${slug},id.eq.${slug}`)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return;
          const mapped = mapMembers([data])[0];
          if (mapped) {
            openChat(mapped);
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
          }
        });
    }

    handleHashChat(window.location.hash);

    function onHashChange() {
      handleHashChat(window.location.hash);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [user?.id]);

  function onAuthRequired() {
    setShowAuth(true);
  }

  function openChat(member) {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setChatMember(member || null);
  }

  function closeChat() {
    setChatMember(null);
  }

  function isUuidSegment(segment) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(segment || ""));
  }

  /** URL/hash segment from notification `link` (e.g. '#/m/jane-doe' → 'jane-doe'). */
  function segmentFromNotificationLink(raw) {
    let segment = String(raw || "")
      .trim()
      .replace(/^#\/m\//i, "")
      .replace(/^#\/u\//i, "")
      .replace(/^\/u\//i, "")
      .replace(/^\//, "")
      .split("?")[0]
      .split("#")[0]
      .trim();
    if (!segment) return "";
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  }

  async function fetchMemberRowBySlugOrId(segment) {
    if (!segment) return null;
    if (isUuidSegment(segment)) {
      const { data } = await supabase.from("members").select("*").eq("id", segment).maybeSingle();
      if (data) return data;
    }
    const { data } = await supabase.from("members").select("*").eq("slug", segment).maybeSingle();
    return data || null;
  }

  /**
   * Opens ChatModal with the peer who sent the message.
   * Prefer `link` (e.g. '#/m/{slug}'); fall back to `from_name` when it is a member id or slug-like string.
   */
  async function openChatFromMessageNotification(item) {
    if (!item || item.type !== "message") return;

    let row = await fetchMemberRowBySlugOrId(segmentFromNotificationLink(item.link));

    if (!row && item.from_name) {
      const hint = String(item.from_name).trim();
      if (hint) {
        if (isUuidSegment(hint)) {
          const { data } = await supabase.from("members").select("*").eq("id", hint).maybeSingle();
          row = data || null;
        } else {
          const asSlug = hint.toLowerCase();
          if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(asSlug)) {
            const { data } = await supabase.from("members").select("*").eq("slug", asSlug).maybeSingle();
            row = data || null;
          }
        }
      }
    }

    if (!row) return;
    const mapped = mapMembers([row])[0];
    if (mapped) openChat(mapped);
  }

  const openProfile = (member) => {
    navigate(profilePathFromMember(member));
  };

  const sharedModals = (
    <>
      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        signInWithGoogle={signInWithGoogle}
        loading={oauthRedirecting || loading}
      />
      <ChatModal open={Boolean(chatMember)} onClose={closeChat} user={user} member={chatMember} />
    </>
  );

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Home
                user={user}
                loadingAuth={loading}
                signingOut={signingOut}
                onSignOut={signOut}
                onAuthRequired={onAuthRequired}
                isFollowing={isFollowing}
                toggleFollow={toggleFollow}
                isBookmarked={isBookmarked}
                toggleBookmark={toggleBookmark}
                onOpenChat={openChat}
                onOpenDashboard={() => navigate("/dashboard")}
                onOpenAdmin={() => navigate("/admin")}
                onOpenProfile={openProfile}
                onMessageNotificationOpen={openChatFromMessageNotification}
              />
              {sharedModals}
            </>
          }
        />
        <Route
          path="/privacy"
          element={
            <>
              <PrivacyPolicy />
              {sharedModals}
            </>
          }
        />
        <Route
          path="/terms"
          element={
            <>
              <Terms />
              {sharedModals}
            </>
          }
        />
        <Route
          path="/contact"
          element={
            <>
              <Contact />
              {sharedModals}
            </>
          }
        />
        <Route
          path="/plans"
          element={
            <>
              <Home
                user={user}
                loadingAuth={loading}
                signingOut={signingOut}
                onSignOut={signOut}
                onAuthRequired={onAuthRequired}
                isFollowing={isFollowing}
                toggleFollow={toggleFollow}
                isBookmarked={isBookmarked}
                toggleBookmark={toggleBookmark}
                onOpenChat={openChat}
                onOpenDashboard={() => navigate("/dashboard")}
                onOpenAdmin={() => navigate("/admin")}
                onOpenProfile={openProfile}
                onMessageNotificationOpen={openChatFromMessageNotification}
                defaultActiveTab="plans"
              />
              {sharedModals}
            </>
          }
        />
        <Route
          path="/dashboard"
          element={
            <>
              <Dashboard
                user={user}
                authInitializing={loading}
                signingOut={signingOut}
                onBack={() => navigate("/")}
                onOpenChat={openChat}
                onOpenProfile={openProfile}
                onSignOut={signOut}
              />
              {sharedModals}
            </>
          }
        />
        <Route
          path="/u/:slug"
          element={
            <>
              <ProfilePage
                user={user}
                onAuthRequired={onAuthRequired}
                isFollowing={isFollowing}
                toggleFollow={toggleFollow}
                onOpenChat={openChat}
              />
              {sharedModals}
            </>
          }
        />
        <Route
          path="/u-app/:slug"
          element={
            <>
              <ProfilePage
                user={user}
                onAuthRequired={onAuthRequired}
                isFollowing={isFollowing}
                toggleFollow={toggleFollow}
                onOpenChat={openChat}
              />
              {sharedModals}
            </>
          }
        />
        <Route
          path="/admin"
          element={
            <>
              {!ADMIN_EMAIL || user?.email !== ADMIN_EMAIL ? (
                <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, textAlign: "center" }}>
                  <div>
                    <h2>Admin access denied</h2>
                    <button
                      type="button"
                      onClick={() => navigate("/", { replace: true })}
                      style={{ border: "none", borderRadius: 999, background: "var(--color-primary)", color: "#FFFFFF", fontWeight: 700, padding: "10px 16px", cursor: "pointer" }}
                    >
                      Back to Home
                    </button>
                  </div>
                </main>
              ) : (
                <AdminPanel user={user} onBack={() => navigate("/")} />
              )}
              {sharedModals}
            </>
          }
        />
      </Routes>
      {showInstallBanner ? (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
            background: "#FFFFFF",
            borderTop: "1px solid #E5E7EB",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 32 }}>🏆</div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 15,
                color: "#1A1A2E",
              }}
            >
              Install TopMLMLeaders
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#6B7280",
                marginTop: 2,
              }}
            >
              Add to home screen for best experience
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              border: "none",
              background: "none",
              fontSize: 20,
              color: "#9CA3AF",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
          <button
            type="button"
            onClick={handleInstall}
            style={{
              border: "none",
              borderRadius: 999,
              background: "var(--color-primary, #6C63FF)",
              color: "#FFFFFF",
              fontWeight: 700,
              padding: "10px 16px",
              fontSize: 14,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Install
          </button>
        </div>
      ) : null}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
