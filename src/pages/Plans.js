import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

const WA_UPGRADE = "https://wa.me/918655381001";

const TESTIMONIALS = [
  { quote: "TopMLMLeaders helped me connect with 500+ leaders!", name: "Sunita Verma", place: "Pune" },
  { quote: "My bookings increased 3x after going Elite", name: "Ravi Mehta", place: "Bangalore" },
  { quote: "Best investment for my MLM business", name: "Priya Sharma", place: "Delhi" },
];

const FAQ = [
  { q: "Can I upgrade anytime?", a: "Yes — upgrade whenever you need more features." },
  { q: "Is there a refund policy?", a: "Yes — 7-day satisfaction window on annual plans (terms apply)." },
  { q: "What payment methods?", a: "UPI, cards, and net banking via Razorpay (coming soon)." },
  { q: "Can I cancel anytime?", a: "Yes — cancel renewal before the next billing cycle." },
  { q: "Is my data secure?", a: "Yes — hosted on Supabase with encryption and industry-standard practices." },
];

function PlanCard({
  name,
  yearlyPrice,
  monthlyApprox,
  color,
  accentButton,
  popular,
  features,
  onUpgrade,
  buttonText,
}) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 20,
        padding: popular ? 22 : 18,
        border: popular ? `2px solid ${color}` : "1px solid var(--color-border)",
        background: "#FFFFFF",
        boxShadow: popular ? `0 16px 48px ${color}33` : "var(--shadow-card)",
        transform: popular ? "scale(1.02)" : "none",
        gridColumn: popular ? "span 1" : "span 1",
      }}
    >
      {popular ? (
        <div
          style={{
            position: "absolute",
            top: -12,
            left: "50%",
            transform: "translateX(-50%)",
            background: color,
            color: "#FFFFFF",
            fontWeight: 800,
            fontSize: 11,
            padding: "4px 12px",
            borderRadius: 999,
          }}
        >
          MOST POPULAR
        </div>
      ) : null}
      <h3 style={{ margin: popular ? "8px 0 6px" : "0 0 6px", fontSize: 20, fontWeight: 800 }}>{name}</h3>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{yearlyPrice}</div>
      {monthlyApprox ? (
        <div style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 14 }}>{monthlyApprox}</div>
      ) : (
        <div style={{ marginBottom: 14 }} />
      )}
      <ul style={{ margin: "0 0 16px", paddingLeft: 18, fontSize: 14, color: "var(--color-text)", lineHeight: 1.7 }}>
        {features.map((line, i) => (
          <li key={i} style={{ marginBottom: 6 }}>
            {line}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onUpgrade}
        style={{
          width: "100%",
          border: "none",
          borderRadius: 999,
          padding: "12px 16px",
          fontWeight: 800,
          cursor: "pointer",
          background: accentButton ? color : "#E5E7EB",
          color: accentButton ? "#FFFFFF" : "var(--color-text)",
        }}
      >
        {buttonText || (popular ? "Go Elite" : name.includes("Starter") ? "Get Started Free" : name.includes("Pro") ? "Upgrade to Pro" : name.includes("Company") ? "Contact Us" : "Choose")}
      </button>
    </div>
  );
}

export default function Plans() {
  const [billing, setBilling] = useState("yearly");
  const [couponInput, setCouponInput] = useState("");
  const [couponStatus, setCouponStatus] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(null);

  function fmtMo(totalAnnual) {
    const perMo = Math.ceil(Number(totalAnnual) / 12);
    return `≈ ₹${perMo.toLocaleString("en-IN")}/mo`;
  }

  function yearlyLabel(amount) {
    return `₹${amount.toLocaleString("en-IN")}/yr`;
  }

  function monthlyStyle(amount) {
    return `₹${Math.ceil(amount / 12).toLocaleString("en-IN")}/mo`;
  }

  function primaryPrice(amount) {
    if (billing === "yearly") return yearlyLabel(amount);
    return monthlyStyle(amount);
  }

  function secondaryHint(amount) {
    if (billing === "yearly") return fmtMo(amount);
    return `Billed ~₹${amount.toLocaleString("en-IN")}/yr if paid annually`;
  }

  function paymentPlaceholder() {
    window.alert("Payment coming soon! Contact us on WhatsApp.");
    window.open(WA_UPGRADE, "_blank", "noopener");
  }

  function starterCta() {
    window.alert("You're set with Starter — explore the directory, follow leaders, and chat anytime.");
  }

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    setCouponStatus("");
    setCouponDiscount(null);
    if (!code) {
      setCouponStatus("Enter a coupon code.");
      return;
    }

    const { data, error } = await supabase.from("coupons").select("*").eq("code", code).maybeSingle();

    if (error || !data) {
      setCouponStatus("Invalid or expired code");
      return;
    }

    if (!data.active) {
      setCouponStatus("Invalid or expired code");
      return;
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setCouponStatus("This coupon has expired");
      return;
    }

    const maxUses = data.max_uses != null ? Number(data.max_uses) : null;
    const used = Number(data.used_count || 0);
    if (maxUses != null && used >= maxUses) {
      setCouponStatus("Invalid or expired code");
      return;
    }

    let label = "";
    if (data.discount_type === "percent") {
      label = `${data.discount_value}% off`;
      setCouponDiscount({ type: "percent", value: Number(data.discount_value), label });
    } else {
      label = `₹${Number(data.discount_value).toLocaleString("en-IN")} off`;
      setCouponDiscount({ type: "fixed", value: Number(data.discount_value), label });
    }
    setCouponStatus(`Applied: ${label}`);
  }

  return (
    <div style={{ padding: "16px 16px 48px", maxWidth: 1120, margin: "0 auto" }}>
      <header style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>💎 Choose Your Plan</h1>
        <p style={{ margin: "10px 0 0", color: "var(--color-muted)", fontSize: 15 }}>Join 1000+ MLM leaders growing with TopMLMLeaders</p>
        <div style={{ marginTop: 18, display: "inline-flex", borderRadius: 999, border: "1px solid var(--color-border)", overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            style={{
              border: "none",
              padding: "10px 20px",
              fontWeight: 700,
              cursor: "pointer",
              background: billing === "monthly" ? "var(--color-primary)" : "#FFFFFF",
              color: billing === "monthly" ? "#FFFFFF" : "var(--color-muted)",
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("yearly")}
            style={{
              border: "none",
              padding: "10px 20px",
              fontWeight: 700,
              cursor: "pointer",
              background: billing === "yearly" ? "var(--color-primary)" : "#FFFFFF",
              color: billing === "yearly" ? "#FFFFFF" : "var(--color-muted)",
            }}
          >
            Yearly <span style={{ fontSize: 11 }}>(2 months free)</span>
          </button>
        </div>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 18,
          marginBottom: 28,
        }}
      >
        <PlanCard
          name="Starter"
          yearlyPrice="₹0 forever"
          monthlyApprox=""
          color="#6B7280"
          accentButton={false}
          popular={false}
          buttonText="Get Started Free"
          features={[
            "✓ Basic profile listing",
            "✓ Search directory",
            "✓ Follow leaders",
            "✓ Chat with members",
            "✓ Bookmark profiles",
            "✗ Custom profile URL",
            "✗ Verified badge",
            "✗ Accept bookings",
          ]}
          onUpgrade={starterCta}
        />
        <PlanCard
          name="Pro 💎"
          yearlyPrice={primaryPrice(1499)}
          monthlyApprox={secondaryHint(1499)}
          color="#6C63FF"
          accentButton
          popular={false}
          buttonText="Upgrade to Pro"
          features={[
            "✓ Everything in Starter",
            "✓ Custom URL (topmlmleaders.com/yourname)",
            "✓ Verified ✓ badge",
            "✓ Photo gallery",
            "✓ Events listing",
            "✓ YouTube video",
            "✓ Social media links",
            "✗ Accept bookings",
            "✗ Top search priority",
          ]}
          onUpgrade={paymentPlaceholder}
        />
        <PlanCard
          name="Elite 🌟"
          yearlyPrice={primaryPrice(3999)}
          monthlyApprox={secondaryHint(3999)}
          color="#F59E0B"
          accentButton
          popular
          buttonText="Go Elite"
          features={[
            "✓ Everything in Pro",
            "✓ Accept booking slots",
            "✓ Top 5 search priority",
            "✓ Team members showcase",
            "✓ Analytics dashboard",
            "✓ Priority support",
            "✓ Featured in directory",
          ]}
          onUpgrade={paymentPlaceholder}
        />
        <PlanCard
          name="Company 🏢"
          yearlyPrice={primaryPrice(7999)}
          monthlyApprox={secondaryHint(7999)}
          color="#185FA5"
          accentButton
          popular={false}
          buttonText="Contact Us"
          features={[
            "✓ Everything in Elite",
            "✓ Company page",
            "✓ Multiple team profiles",
            "✓ Custom branding",
            "✓ Advanced analytics",
            "✓ Dedicated support",
            "✓ API access",
          ]}
          onUpgrade={paymentPlaceholder}
        />
      </section>

      <section style={{ background: "#FFFFFF", borderRadius: 18, padding: 18, border: "1px solid var(--color-border)", marginBottom: 28, boxShadow: "var(--shadow-card)" }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>Have a coupon code?</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
            placeholder="Enter code"
            style={{
              flex: "1 1 200px",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid var(--color-border)",
              fontFamily: "Inter, sans-serif",
            }}
          />
          <button
            type="button"
            onClick={applyCoupon}
            style={{
              border: "none",
              borderRadius: 12,
              background: "var(--color-primary)",
              color: "#FFFFFF",
              fontWeight: 700,
              padding: "12px 20px",
              cursor: "pointer",
            }}
          >
            Apply
          </button>
        </div>
        {couponStatus ? (
          <p style={{ margin: "10px 0 0", fontSize: 14, color: couponStatus.startsWith("Applied") ? "#10B981" : "#DC2626" }}>{couponStatus}</p>
        ) : null}
        {couponDiscount ? (
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--color-muted)" }}>
            Discount: <strong>{couponDiscount.label}</strong>
          </p>
        ) : null}
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, marginBottom: 14, textAlign: "center" }}>Loved by leaders</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {TESTIMONIALS.map((t, i) => (
            <blockquote
              key={i}
              style={{
                margin: 0,
                padding: 16,
                borderRadius: 16,
                background: "#FFFFFF",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-card)",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              <p style={{ margin: "0 0 10px", fontStyle: "italic" }}>&ldquo;{t.quote}&rdquo;</p>
              <footer style={{ fontWeight: 700, color: "var(--color-primary)" }}>
                — {t.name}, {t.place}
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 20, marginBottom: 14, textAlign: "center" }}>FAQ</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {FAQ.map((item, i) => (
            <details
              key={i}
              style={{
                borderRadius: 14,
                border: "1px solid var(--color-border)",
                background: "#FFFFFF",
                padding: "12px 14px",
              }}
            >
              <summary style={{ fontWeight: 700, cursor: "pointer" }}>{item.q}</summary>
              <p style={{ margin: "10px 0 0", color: "var(--color-muted)", fontSize: 14 }}>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
