import React, { useEffect, useRef, useState } from "react";
import { useChat } from "../features/chat";

/** Supabase timestamptz often arrives without Z; naive strings are UTC. */
function parseMessageTimestamp(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const iso = raw.includes("T") ? raw : raw.replace(" ", "T");

  if (/[zZ]$/.test(iso)) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (/[+-]\d{2}:\d{2}(?::\d{2})?$/.test(iso)) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (/[+-]\d{2}$/.test(iso)) {
    const d = new Date(iso.replace(/([+-]\d{2})$/, "$1:00"));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const naive = iso.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?$/
  );
  if (naive) {
    const [, y, mo, d, h, mi, sec = "0", frac] = naive;
    const ms = frac ? Math.round(Number(`0.${frac}`) * 1000) : 0;
    return new Date(
      Date.UTC(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(h),
        Number(mi),
        Number(sec),
        ms
      )
    );
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatTime(value) {
  const date = parseMessageTimestamp(value);
  if (!date) return "";

  const dayKey = (d) =>
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);

  const isToday = dayKey(date) === dayKey(new Date());

  const timeStr = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return timeStr;

  const datePart = date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });

  return `${datePart} ${timeStr}`;
}

function ChatBubble({ message, isOwn }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isOwn ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          maxWidth: "80%",
          borderRadius: 14,
          padding: "9px 11px",
          background: isOwn ? "var(--color-primary)" : "#F3F4F6",
          color: isOwn ? "#FFFFFF" : "var(--color-text)",
        }}
      >
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {message.message ?? message.text}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            opacity: 0.9,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>{formatTime(message.created_at)}</span>
          {isOwn ? <span>{message.read ? "✓✓" : "✓"}</span> : null}
        </div>
      </div>
    </div>
  );
}

function ChatModal({ open, onClose, user, member }) {
  const [text, setText] = useState("");
  const listRef = useRef(null);
  const { messages, sendMessage, loading, peerMissing, senderMissing, myMemberId } = useChat(user, member);

  const onlineText = null;

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, messages]);

  if (!open || !member) return null;

  async function onSend() {
    const value = text.trim();
    if (!value || peerMissing || senderMissing || !myMemberId) return;
    setText("");
    await sendMessage(value);
  }

  function onEnter(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onSend();
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 250,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="slide-up"
        style={{
          width: "100%",
          maxWidth: 480,
          height: "90vh",
          background: "#FFFFFF",
          borderRadius: "18px 18px 0 0",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            borderBottom: "1px solid var(--color-border)",
            background: "#FFFFFF",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--color-primary), #4338CA)",
                color: "#FFFFFF",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
              }}
            >
              {String(member["initials"] || member.photo_initials || "ML").slice(0, 2)}
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>{member.name}</div>
              {onlineText ? (
                <div style={{ color: "#10B981", fontSize: 12 }}>{onlineText}</div>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 24,
              color: "var(--color-muted)",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </header>

        {peerMissing ? (
          <div
            style={{
              margin: 12,
              background: "#FEF3C7",
              color: "#92400E",
              border: "1px solid #FDE68A",
              borderRadius: 12,
              padding: 10,
              fontSize: 13,
            }}
          >
            This member hasn't set up their account yet. Chat will be available
            when they join.
          </div>
        ) : null}
        {senderMissing ? (
          <div
            style={{
              margin: 12,
              background: "#FEF3C7",
              color: "#92400E",
              border: "1px solid #FDE68A",
              borderRadius: 12,
              padding: 10,
              fontSize: 13,
            }}
          >
            Claim or complete your leader profile in the dashboard before sending messages.
          </div>
        ) : null}

        <section
          ref={listRef}
          className="no-scrollbar"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            background: "#F9FAFB",
          }}
        >
          {loading ? (
            <div style={{ textAlign: "center", color: "var(--color-muted)" }}>
              Loading chat...
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--color-muted)", marginTop: 22 }}>
              Start your conversation with {member.name}
            </div>
          ) : (
            messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                isOwn={Boolean(myMemberId) && message.sender_id === myMemberId}
              />
            ))
          )}
        </section>

        <footer
          style={{
            padding: "10px 12px calc(10px + var(--safe-bottom))",
            borderTop: "1px solid var(--color-border)",
            background: "#FFFFFF",
            display: "flex",
            gap: 8,
          }}
        >
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onEnter}
            disabled={peerMissing || senderMissing}
            placeholder={
              peerMissing || senderMissing ? "Chat unavailable" : "Type a message"
            }
            style={{
              flex: 1,
              borderRadius: 999,
              border: "1px solid var(--color-border)",
              padding: "10px 14px",
              outline: "none",
              fontFamily: "Inter, sans-serif",
            }}
          />
          <button
            type="button"
            onClick={onSend}
            disabled={peerMissing || senderMissing || !text.trim()}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "10px 14px",
              background: "var(--color-primary)",
              color: "#FFFFFF",
              fontWeight: 700,
              cursor: "pointer",
              opacity: peerMissing || senderMissing || !text.trim() ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </footer>
      </div>
    </div>
  );
}

export default ChatModal;

