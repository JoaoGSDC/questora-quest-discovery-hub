/** URL canônica do app (OAuth Twitch exige match exato com o console). */
export function getCanonicalAppUrl(): string {
  const fromEnv = process.env["NEXT_PUBLIC_APP_URL"]?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  // Produção padrão deste projeto
  if (process.env["VERCEL"] === "1") {
    return "https://questora-quest-discovery-hub.vercel.app";
  }
  return "http://localhost:3000";
}

export function getTwitchCallbackUrl(): string {
  return `${getCanonicalAppUrl()}/api/twitch/callback`;
}
