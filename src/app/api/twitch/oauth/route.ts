import { NextResponse } from "next/server";
import { getRequestOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const clientId = process.env["TWITCH_CLIENT_ID"]?.replace(/^["']|["']$/g, "");
  const origin = getRequestOrigin(req);
  const url = new URL(req.url);

  // Preferência: redirect_uri explícito do cliente (mesma origem).
  // Ignora TWITCH_REDIRECT_URI (era a causa do localhost na Vercel).
  const fromQuery = url.searchParams.get("redirect_uri")?.trim();
  let redirect = `${origin}/api/twitch/callback`;
  if (fromQuery) {
    try {
      const parsed = new URL(fromQuery);
      if (
        parsed.pathname === "/api/twitch/callback" &&
        parsed.origin === origin
      ) {
        redirect = `${parsed.origin}/api/twitch/callback`;
      }
    } catch {
      /* keep default */
    }
  }

  if (!clientId) {
    return NextResponse.json(
      { error: "TWITCH_CLIENT_ID não configurado" },
      { status: 500 },
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: "code",
    scope: "chat:read",
    force_verify: "true",
  });

  const res = NextResponse.redirect(
    `https://id.twitch.tv/oauth2/authorize?${params.toString()}`,
  );
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}
