import React, { useEffect, useRef, useState } from "react";

function getSpeechRecognition() {
  return typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;
}

export default function AISearchAssistant({
  open,
  ask,
  loading,
  assistantNote,
}) {
  const [inputValue, setInputValue] = useState("");
  const [localError, setLocalError] = useState("");
  const [recording, setRecording] = useState(false);

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const hasSpeechRecognition = Boolean(getSpeechRecognition());

  useEffect(() => {
    if (!open) {
      setLocalError("");
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      if (recording && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          /* ignore */
        }
        recognitionRef.current = null;
        setRecording(false);
      }
    }
  }, [open, recording]);

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  function bumpSilenceKill() {
    if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = window.setTimeout(() => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    }, 2600);
  }

  async function handleAskClick() {
    setLocalError("");
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setLocalError("Please describe who you're looking for");
      return;
    }
    await ask(trimmed);
  }

  function startMic() {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition || recording) return;

    try {
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      recognitionRef.current?.stop?.();
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        bumpSilenceKill();
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) setInputValue(transcript);
      };

      recognition.onerror = () => setRecording(false);
      recognition.onend = () => {
        setRecording(false);
        if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setRecording(true);
      bumpSilenceKill();
    } catch {
      setRecording(false);
    }
  }

  if (!open) return null;

  return (
    <div className="slide-up" style={{ marginTop: 14 }}>
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 16,
          boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
          padding: 14,
          maxWidth: "100%",
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: "var(--color-text)" }}>🧠 AI Search Assistant</div>
          <div style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 4 }}>
            Describe who you're looking for in plain English
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "stretch", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px", display: "flex", alignItems: "center", gap: 8, background: "#F8FAFC", borderRadius: 14, border: "1px solid rgba(255,255,255,0.6)", padding: "6px 6px 6px 12px", minHeight: 52 }}>
            <span style={{ color: "#6B7280" }}>⌨️</span>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setLocalError("");
              }}
              placeholder="e.g. Find diamond leaders in Mumbai with 5+ years experience"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                minHeight: 44,
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                background: "#FFFFFF",
                borderRadius: 12,
                padding: "10px 12px",
                color: "var(--color-text)",
              }}
            />
            {hasSpeechRecognition ? (
              <button
                type="button"
                aria-label={recording ? "Listening" : "Voice input"}
                onClick={() => (!recording ? startMic() : null)}
                disabled={recording}
                style={{
                  alignSelf: "flex-end",
                  borderRadius: 12,
                  border: recording ? "1px solid #FECACA" : "1px solid var(--color-border)",
                  background: recording ? "#FEF2F2" : "#FFFFFF",
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  cursor: recording ? "default" : "pointer",
                  display: "grid",
                  placeItems: "center",
                  marginBottom: 2,
                }}
              >
                {recording ? <span className="pulse">🔴</span> : <span>🎤</span>}
              </button>
            ) : null}
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={handleAskClick}
            style={{
              flex: "0 0 auto",
              alignSelf: "center",
              borderRadius: 12,
              border: "none",
              background: "var(--color-primary)",
              color: "#FFFFFF",
              fontWeight: 800,
              padding: "14px 20px",
              minWidth: 100,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.85 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              height: "fit-content",
            }}
          >
            {loading ? <span className="spinner">⏳</span> : null}
            🔍 Ask
          </button>
        </div>

        {localError ? (
          <p style={{ margin: "10px 0 0", fontSize: 13, color: "#DC2626" }}>{localError}</p>
        ) : null}
        {assistantNote ? (
          <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--color-muted)" }}>{assistantNote}</p>
        ) : null}
      </div>
    </div>
  );
}
