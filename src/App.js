import React, { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import "./App.css";
import Home from "./pages/Home";
import ProfilePage from "./pages/ProfilePage";
import Dashboard from "./features/dashboard";
import AdminPanel from "./features/admin";
import AuthModal from "./features/auth";
import ChatModal from "./components/ChatModal";
import { useAuth } from "./features/auth/useAuth";
import { useFollow } from "./features/follow/useFollow";
import { useBookmarks } from "./features/bookmarks/useBookmarks";
import { supabase } from "./lib/supabaseClient";
import { mapMembers } from "./features/search";

const ADMIN_EMAIL = process.env.REACT_APP_ADMIN_EMAIL || "";

function profilePathFromMember(member) {
  if (!member) return "/";
  const slug = member.slug && String(member.slug).trim();
  if (slug) return `/u/${encodeURIComponent(slug)}`;
  return `/u/${encodeURIComponent(member.id)}`;
}

function AppRoutes() {
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [chatMember, setChatMember] = useState(null);
  const { user, loading, oauthRedirecting, signingOut, signInWithGoogle, signOut } = useAuth();
  const { isFollowing, toggleFollow } = useFollow(user, () => setShowAuth(true));
  const { isBookmarked, toggleBookmark } = useBookmarks(user, () => setShowAuth(true));
  const hadUserRef = useRef(false);

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

  async function openChatFromMessageNotification(item) {
    if (!item || item.type !== "message") return;
    const raw = String(item.link || "").trim();
    let segment = raw
      .replace(/^#\/m\//i, "")
      .replace(/^#\/u\//i, "")
      .replace(/^\/u\//i, "")
      .replace(/^\//, "")
      .split("?")[0]
      .split("#")[0];
    if (!segment) return;
    try {
      segment = decodeURIComponent(segment);
    } catch {
      /* ignore */
    }
    let row = null;
    if (isUuidSegment(segment)) {
      const { data } = await supabase.from("members").select("*").eq("id", segment).maybeSingle();
      row = data;
    }
    if (!row) {
      const { data } = await supabase.from("members").select("*").eq("slug", segment).maybeSingle();
      row = data;
    }
    if (!row) return;
    const mapped = mapMembers([row])[0];
    if (mapped) setChatMember(mapped);
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
