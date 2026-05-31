import { ImageResponse } from "next/og";

// Branded 1200x630 social sharing card. Generated at build/request time so
// link previews (Facebook, X, LinkedIn, iMessage, Discord, Slack) render a
// real raster image instead of the unsupported SVG favicon.
export const alt = "SoldierHub — Fort Bliss & El Paso Military Community";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0B1C2C 0%, #122B45 60%, #0B1C2C 100%)",
          color: "#F6F3EC",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: "14px",
            background: "#B31942",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            height: "100%",
            width: "14px",
            background: "#1E4E8C",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#9DBBE0",
          }}
        >
          Fort Bliss · El Paso, TX
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 120,
            fontWeight: 800,
            marginTop: 18,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          SoldierHub
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 40,
            fontWeight: 600,
            marginTop: 28,
            maxWidth: "880px",
            color: "#E4ECF6",
            lineHeight: 1.25,
          }}
        >
          Ask, share, and support the Fort Bliss military community.
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 24,
            marginTop: 40,
            color: "#8FA7C4",
          }}
        >
          Independent &amp; unofficial · PCS help · BAH tools · Gate info · Resources
        </div>
      </div>
    ),
    { ...size }
  );
}
