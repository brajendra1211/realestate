import { NextRequest, NextResponse } from "next/server";
import { generateQrPngBuffer, generateQrSvg, getAgentShopUrl } from "@/lib/qr";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code") || searchParams.get("agentCode");
  const rawUrl = searchParams.get("url") || searchParams.get("text");
  const format = (searchParams.get("format") || "png").toLowerCase();
  const download = searchParams.get("download") === "true";
  const size = parseInt(searchParams.get("size") || "512", 10);

  let targetUrl: string;
  let filename = "Channel-Partner-QR";

  if (code) {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    targetUrl = getAgentShopUrl(code, origin);
    filename = `BayaEstate-Shop-QR-${code.trim()}`;
  } else if (rawUrl) {
    targetUrl = rawUrl;
    filename = "QR-Code";
  } else {
    return NextResponse.json({ error: "Missing 'code' or 'url' query parameter" }, { status: 400 });
  }

  try {
    if (format === "svg") {
      const svg = await generateQrSvg(targetUrl, {
        width: Math.min(Math.max(size, 128), 2048),
        margin: 2,
      });

      const headers = new Headers({
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      });

      if (download) {
        headers.set("Content-Disposition", `attachment; filename="${filename}.svg"`);
      }

      return new Response(svg, { status: 200, headers });
    }

    // Default to PNG
    const pngBuffer = await generateQrPngBuffer(targetUrl, {
      width: Math.min(Math.max(size, 128), 2048),
      margin: 2,
    });

    const headers = new Headers({
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    });

    if (download) {
      headers.set("Content-Disposition", `attachment; filename="${filename}.png"`);
    }

    return new Response(new Uint8Array(pngBuffer), { status: 200, headers });
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}
