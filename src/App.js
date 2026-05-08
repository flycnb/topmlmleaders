import React, { useState } from "react";
import "./App.css";
import Home from "./pages/Home";
import MemberProfile from "./features/profile";
import AuthModal from "./features/auth";
import { useAuth } from "./features/auth/useAuth";
import { useFollow } from "./features/follow/useFollow";
import { useBookmarks } from "./features/bookmarks/useBookmarks";
import FlagModal from "./features/flags/FlagModal";

function App() {
  const [currentScreen, setCurrentScreen] = useState("home");
  const [selectedMember, setSelectedMember] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [flagMember, setFlagMember] = useState(null);
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const { isFollowing, toggleFollow } = useFollow(user, () => setShowAuth(true));
  const { isBookmarked, toggleBookmark } = useBookmarks(user, () => setShowAuth(true));

  function onAuthRequired() {
    setShowAuth(true);
  }

  if (currentScreen === "home") {
    return (
      <>
        <Home
          user={user}
          loadingAuth={loading}
          onSignOut={signOut}
          onAuthRequired={onAuthRequired}
          isFollowing={isFollowing}
          toggleFollow={toggleFollow}
          isBookmarked={isBookmarked}
          toggleBookmark={toggleBookmark}
          onFlagMember={setFlagMember}
          onOpenDashboard={() => setCurrentScreen("dashboard")}
          onOpenProfile={(member) => {
            setSelectedMember(member);
            setCurrentScreen("profile");
          }}
        />
        <AuthModal
          open={showAuth}
          onClose={() => setShowAuth(false)}
          signInWithGoogle={signInWithGoogle}
          loading={loading}
        />
        <FlagModal
          open={Boolean(flagMember)}
          onClose={() => setFlagMember(null)}
          user={user}
          member={flagMember}
          onAuthRequired={onAuthRequired}
        />
      </>
    );
  }

  if (currentScreen === "dashboard") {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 20 }}>
        <div>
          <h2>Dashboard Screen</h2>
          <button type="button" onClick={() => setCurrentScreen("home")} style={{ border: "none", borderRadius: 999, background: "var(--color-primary)", color: "#FFFFFF", fontWeight: 700, padding: "10px 16px", cursor: "pointer" }}>
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  if (currentScreen === "profile") {
    return (
      <>
        <MemberProfile
          member={selectedMember}
          user={user}
          onAuthRequired={onAuthRequired}
          isFollowing={isFollowing}
          toggleFollow={toggleFollow}
          onBack={() => setCurrentScreen("home")}
        />
        <AuthModal
          open={showAuth}
          onClose={() => setShowAuth(false)}
          signInWithGoogle={signInWithGoogle}
          loading={loading}
        />
      </>
    );
  }

  return <main style={{ padding: 24 }}>Admin Screen</main>;
}

export default App;
