import React from "react";
import { QRCodeCanvas } from "qrcode.react";

function QRCodeModal({ open, onClose, member }) {
  if (!open || !member) return null;

  const slug = member.slug || member.id || "";
  const url = slug ? `https://topmlmleaders.com/u/${slug}` : "https://topmlmleaders.com";
  const qrId = "member-profile-qr";

  function handleDownload() {
    const canvas = document.getElementById(qrId);
    if (!canvas) return;
    const data = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = data;
    link.download = `${String(member.name || "member").replace(/\s+/g, "-").toLowerCase()}-topmlmleaders-qr.png`;
    link.click();
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(0,0,0,0.55)", display: "grid", placeItems: "center", padding: 18 }}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: 360, borderRadius: 20, background: "#FFFFFF", padding: 18, textAlign: "center" }}>
        <h3 style={{ marginTop: 4 }}>Scan My Profile</h3>
        <p style={{ margin: "10px 0 12px", color: "var(--color-muted)", fontSize: 14, lineHeight: 1.5 }}>
          Show this QR to save your contact automatically in your friend&apos;s mobile
        </p>
        <div style={{ background: "#F8FAFC", borderRadius: 14, padding: 14, display: "inline-flex" }}>
          <QRCodeCanvas id={qrId} value={url} size={220} includeMargin />
        </div>
        <div style={{ marginTop: 12, color: "var(--color-muted)", fontSize: 13 }}>{url}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, borderRadius: 12, border: "1px solid var(--color-border)", background: "#FFFFFF", padding: "10px 12px", fontWeight: 700, cursor: "pointer" }}>
            Close
          </button>
          <button type="button" onClick={handleDownload} style={{ flex: 1, borderRadius: 12, border: "none", background: "var(--color-primary)", color: "#FFFFFF", padding: "10px 12px", fontWeight: 700, cursor: "pointer" }}>
            Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}

export default QRCodeModal;
