import React, { useState } from "react";
import "./App.css";
import Home from "./pages/Home";
import MemberProfile from "./features/profile";
import Dashboard from "./features/dashboard";
import AuthModal from "./features/auth";
import ChatModal from "./components/ChatModal";
import { useAuth } from "./features/auth/useAuth";
import { useFollow } from "./features/follow/useFollow";
import { useBookmarks } from "./features/bookmarks/useBookmarks";
import FlagModal from "./features/flags/FlagModal";

function App() {
  const [currentScreen, setCurrentScreen] = useState("home");
  const [selectedMember, setSelectedMember] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [flagMember, setFlagMember] = useState(null);
  const [chatMember, setChatMember] = useState(null);
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const { isFollowing, toggleFollow } = useFollow(user, () => setShowAuth(true));
  const { isBookmarked, toggleBookmark } = useBookmarks(user, () => setShowAuth(true));

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
          onOpenChat={openChat}
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
        <ChatModal open={Boolean(chatMember)} onClose={closeChat} user={user} member={chatMember} />
      </>
    );
  }

  if (currentScreen === "dashboard") {
    return (
      <>
        <Dashboard
          user={user}
          onBack={() => setCurrentScreen("home")}
          onOpenChat={openChat}
          onOpenProfile={(member) => {
            setSelectedMember(member);
            setCurrentScreen("profile");
          }}
          onSignOut={signOut}
        />
        <AuthModal
          open={showAuth}
          onClose={() => setShowAuth(false)}
          signInWithGoogle={signInWithGoogle}
          loading={loading}
        />
        <ChatModal open={Boolean(chatMember)} onClose={closeChat} user={user} member={chatMember} />
      </>
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
          onOpenChat={openChat}
          onBack={() => setCurrentScreen("home")}
        />
        <AuthModal
          open={showAuth}
          onClose={() => setShowAuth(false)}
          signInWithGoogle={signInWithGoogle}
          loading={loading}
        />
        <ChatModal open={Boolean(chatMember)} onClose={closeChat} user={user} member={chatMember} />
      </>
    );
  }

  return <main style={{ padding: 24 }}>Admin Screen</main>;
}

export default App;
