import { ImageResponse } from "next/og";

import { formatLiveDate } from "@/lib/format";
import { normalizeHandle } from "@/lib/handle";
import { getPublishedShowcaseByHandle } from "@/server/db/queries/public-showcase";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const normalizedHandle = normalizeHandle(handle);
  const showcase = normalizedHandle
    ? await getPublishedShowcaseByHandle(normalizedHandle)
    : null;

  const title = showcase?.live?.title ?? "Live Showcase";
  const creator = showcase?.creator.name ?? "Vitrine";
  const store = showcase?.live?.store ?? "Produtos escolhidos";
  const date = showcase?.live ? formatLiveDate(showcase.live.liveDate) : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #fff7ed 0%, #fce7f3 100%)",
          color: "#3b1434",
          padding: 72,
          fontFamily: "Arial",
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 700 }}>@{handle}</div>
        <div>
          <div style={{ fontSize: 44, marginBottom: 16 }}>{creator}</div>
          <div
            style={{
              fontSize: 74,
              fontWeight: 800,
              lineHeight: 1.05,
              maxWidth: 940,
            }}
          >
            {title}
          </div>
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 34 }}>
          <span>{store}</span>
          {date && <span>{date}</span>}
        </div>
      </div>
    ),
    size,
  );
}
