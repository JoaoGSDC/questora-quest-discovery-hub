import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const clientId = process.env["TWITCH_CLIENT_ID"]?.replace(/^["']|["']$/g, "");
  const url = new URL(req.url);
  // Sempre a origem da request (localhost em dev, Vercel em prod).
  const redirect = `${url.origin}/api/twitch/callback`;

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
  return NextResponse.redirect(
    `https://id.twitch.tv/oauth2/authorize?${params.toString()}`,
  );
}
