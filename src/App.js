import React, { useState } from "react";
import "./App.css";
import Home from "./pages/Home";
import MemberProfile from "./features/profile";

function App() {
  const [currentScreen, setCurrentScreen] = useState("home");
  const [selectedMember, setSelectedMember] = useState(null);

  if (currentScreen === "home") {
    return (
      <Home
        onOpenDashboard={() => setCurrentScreen("dashboard")}
        onOpenProfile={(member) => {
          setSelectedMember(member);
          setCurrentScreen("profile");
        }}
      />
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
      <MemberProfile
        member={selectedMember}
        onBack={() => {
          setCurrentScreen("home");
        }}
      />
    );
  }

  return <main style={{ padding: 24 }}>Admin Screen</main>;
}

export default App;
