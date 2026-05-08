import React from "react";

function Avatar({ avatarUrl, initials, color = "#6C63FF", size = 56 }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={initials || "Avatar"}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "3px solid #FFFFFF",
          background: "#FFFFFF",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "3px solid #FFFFFF",
        background: `linear-gradient(135deg, ${color}, #4338ca)`,
        color: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: Math.round(size * 0.33),
      }}
    >
      {String(initials || "ML").slice(0, 2).toUpperCase()}
    </div>
  );
}

export default Avatar;
