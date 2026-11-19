import { NextResponse } from "next/server";
import { getRequestOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Só o client_id (público no OAuth) + origem detectada no server. */
export async function GET(req: Request) {
  const clientId = process.env["TWITCH_CLIENT_ID"]?.replace(/^["']|["']$/g, "");
  const origin = getRequestOrigin(req);
  return NextResponse.json(
    {
      clientId: clientId || null,
      serverOrigin: origin,
      serverCallback: `${origin}/api/twitch/callback`,
      // Se isso aparecer como localhost na Vercel, o Host/proxy está errado.
      vercelUrl: process.env["VERCEL_URL"]
        ? `https://${process.env["VERCEL_URL"]}`
        : null,
      vercelEnv: process.env["VERCEL_ENV"] ?? null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
