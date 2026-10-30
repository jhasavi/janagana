import { ImageResponse } from "next/og";
import { SITE_TITLE } from "@/lib/marketing";

export const alt = `JanaGana: ${SITE_TITLE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "white",
          background: "linear-gradient(135deg, #a84f0e 0%, #7a3410 100%)",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 800 }}>JanaGana</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1, maxWidth: 980 }}>
            Memberships, events and your CRM in one easy dashboard
          </div>
          <div style={{ fontSize: 30, opacity: 0.95 }}>For nonprofits and small businesses · Free to start</div>
        </div>
      </div>
    ),
    size,
  );
}
