import { NextResponse } from "next/server";
import { setTwitch } from "@/db/repository";
import { seedIfEmpty } from "@/db/seed";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await seedIfEmpty();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");
  if (err || !code) {
    return NextResponse.redirect(
      new URL("/settings?twitch=error", url.origin),
    );
  }

  const clientId = process.env['TWITCH_CLIENT_ID'];
  const clientSecret = process.env['TWITCH_CLIENT_SECRET'];
  const redirect =
    process.env['TWITCH_REDIRECT_URI'] ??
    `${url.origin}/api/twitch/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/settings?twitch=missing_env", url.origin),
    );
  }

  const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirect,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL("/settings?twitch=token_error", url.origin),
    );
  }

  const token = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  let username: string | null = null;
  const val = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${token.access_token}` },
  });
  if (val.ok) {
    const v = (await val.json()) as { login?: string };
    username = v.login ?? null;
  }

  await setTwitch({
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? null,
    tokenExpiresAt: Date.now() + token.expires_in * 1000,
    twitchUsername: username,
  });

  return NextResponse.redirect(
    new URL("/settings?twitch=connected", url.origin),
  );
}
