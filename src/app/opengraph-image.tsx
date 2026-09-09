import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.description}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Imagem Open Graph gerada no build. Texto real, sem métricas inventadas.
 */
export default function OpengraphImage() {
  const mark = readFileSync(
    join(process.cwd(), "public/marca/fidelize-simbolo-branco.png"),
  ).toString("base64");

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
          background:
            "linear-gradient(135deg, #1e0b47 0%, #46209a 55%, #6d3ce0 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${mark}`}
            alt=""
            width={54}
            height={61}
          />
          <div
            style={{
              fontSize: 26,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#c0affb",
            }}
          >
            Fidelize.club
          </div>
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 78,
            fontWeight: 700,
            lineHeight: 1.05,
            maxWidth: 900,
          }}
        >
          Clientes que voltam sempre.
        </div>
        <div
          style={{
            marginTop: 30,
            fontSize: 32,
            lineHeight: 1.4,
            maxWidth: 860,
            color: "#dbd2fd",
          }}
        >
          {site.description}
        </div>
      </div>
    ),
    size,
  );
}
