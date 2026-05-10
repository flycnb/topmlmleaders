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
    if (url.searchParams.has("code")) {
      window.history.replaceState({}, "", `${url.pathname}${url.hash}`);
    }
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
