import { ImageResponse } from "next/og";

export const alt = "InfiniteNotes — Learn It. Play It. Understand It.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 72,
          background:
            "linear-gradient(135deg, #080a14 0%, #121526 45%, #0284c7 100%)",
          color: "#eef2ff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: -1,
            backgroundImage: "linear-gradient(120deg, #38bdf8, #c084fc, #e879f9)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          InfiniteNotes
        </div>
        <div style={{ marginTop: 18, fontSize: 32, opacity: 0.9 }}>
          Learn it. Play it. Understand it.
        </div>
        <div style={{ marginTop: 14, fontSize: 22, opacity: 0.7, maxWidth: 720 }}>
          An intelligent music platform for discovery, lyrics, learning, and more.
        </div>
      </div>
    ),
    { ...size },
  );
}
