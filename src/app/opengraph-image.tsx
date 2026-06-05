import { ImageResponse } from "next/og";

export const alt = "VitalChain — Pharma Supply Chain Intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Dynamically rendered Open Graph / social-share card. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0b0f1a 0%, #0f1626 60%, #11203a 100%)",
          padding: "72px",
          color: "#e6edf6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "rgba(45, 212, 191, 0.15)",
              color: "#2dd4bf",
              fontSize: "36px",
              fontWeight: 800,
            }}
          >
            V
          </div>
          <div style={{ display: "flex", fontSize: "40px", fontWeight: 800, letterSpacing: "-1px" }}>
            Vital<span style={{ color: "#2dd4bf" }}>Chain</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", fontSize: "62px", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-2px", maxWidth: "950px" }}>
            Pharma Supply Chain Intelligence
          </div>
          <div style={{ display: "flex", fontSize: "30px", color: "#9fb0c7", maxWidth: "920px", lineHeight: 1.35 }}>
            Track & trace · Cold chain · Quality/NSQ · QMS · Warehouse · Inventory · Compliance
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "24px", color: "#5a6a82" }}>
          <span style={{ display: "flex", color: "#2dd4bf" }}>CDSCO · India-first</span>
          <span style={{ display: "flex" }}>·</span>
          <span style={{ display: "flex" }}>vitalchain.vercel.app</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
