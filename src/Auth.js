import { useState } from "react";
import { supabase } from "./supabase";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handle = async () => {
    setLoading(true);
    setMsg("");
    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
      else onLogin(data.user);
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      if (error) setMsg(error.message);
      else setMsg("Check your email to confirm signup!");
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: "60px auto", padding: 24, fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#7F77DD" }}>🌐 TopMLMLeaders</div>
        <div style={{ fontSize: 13, color: "#999", marginTop: 4 }}>Find · Connect · Grow Worldwide</div>
      </div>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 2px 20px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, background: mode === m ? "#7F77DD" : "#f5f5f5", color: mode === m ? "#fff" : "#666", border: "none", borderRadius: 10, padding: "10px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              {m === "login" ? "Login" : "Sign Up"}
            </button>
          ))}
        </div>
        {mode === "signup" && (
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your Full Name" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: 14, marginBottom: 12, boxSizing: "border-box", outline: "none" }} />
        )}
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: 14, marginBottom: 12, boxSizing: "border-box", outline: "none" }} />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: 14, marginBottom: 16, boxSizing: "border-box", outline: "none" }} />
        {msg && <div style={{ fontSize: 13, color: msg.includes("Check") ? "#1D9E75" : "#E24B4A", marginBottom: 12, textAlign: "center" }}>{msg}</div>}
        <button onClick={handle} disabled={loading} style={{ width: "100%", background: "#7F77DD", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
        </button>
      </div>
    </div>
  );
}
