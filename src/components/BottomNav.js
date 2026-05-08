import React from "react";

const ITEMS = [
  { key: "directory", label: "Directory", icon: "🔍" },
  { key: "top", label: "Top", icon: "🏆" },
  { key: "board", label: "Board", icon: "📋" },
  { key: "plans", label: "Plans", icon: "💎" },
];

function BottomNav({ activeTab, onChange }) {
  return (
    <nav
      className="safe-bottom"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        borderTop: "1px solid var(--color-border)",
        background: "#FFFFFF",
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        paddingTop: 8,
      }}
    >
      {ITEMS.map((item) => {
        const isActive = activeTab === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            style={{
              border: "none",
              background: "transparent",
              color: isActive ? "var(--color-primary)" : "#9CA3AF",
              padding: "6px 4px 10px",
              fontWeight: isActive ? 700 : 600,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            <div style={{ fontSize: 18, lineHeight: 1.1 }}>{item.icon}</div>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNav;
