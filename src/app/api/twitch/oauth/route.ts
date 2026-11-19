import { NextResponse } from "next/server";
import { getTwitchCallbackUrl } from "@/lib/app-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = process.env["TWITCH_CLIENT_ID"]?.replace(/^["']|["']$/g, "");
  const redirect = getTwitchCallbackUrl();

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
