import React, { useState } from "react";
import "./App.css";
import { supabase } from "./lib/supabaseClient";

const SCREENS = {
  home: "Home Screen",
  profile: "Profile Screen",
  dashboard: "Dashboard Screen",
  admin: "Admin Screen",
};

function App() {
  const [currentScreen, setCurrentScreen] = useState("home");
  void supabase;

  return (
    <main className="fade-in" style={{ minHeight: "100vh", padding: "24px" }}>
      <header style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>
          TopMLMLeaders.com v2
        </h1>
        <p style={{ color: "var(--color-muted)" }}>
          Routing shell only. Feature implementation starts in next tickets.
        </p>
      </header>

      <nav style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
        <button type="button" onClick={() => setCurrentScreen("home")}>
          Home
        </button>
        <button type="button" onClick={() => setCurrentScreen("profile")}>
          Profile
        </button>
        <button type="button" onClick={() => setCurrentScreen("dashboard")}>
          Dashboard
        </button>
        <button type="button" onClick={() => setCurrentScreen("admin")}>
          Admin
        </button>
      </nav>

      <section className="slide-up">
        <h2 style={{ fontSize: "20px", fontWeight: 700 }}>{SCREENS[currentScreen]}</h2>
      </section>
    </main>
  );
}

export default App;
