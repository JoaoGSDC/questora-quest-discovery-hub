const PRODUCTION_APP_URL =
  "https://questora-quest-discovery-hub.vercel.app";

/** URL canônica do app (callback Twitch fixo de produção). */
export function getCanonicalAppUrl(): string {
  return PRODUCTION_APP_URL;
}

export function getTwitchCallbackUrl(): string {
  return `${PRODUCTION_APP_URL}/api/twitch/callback`;
}
