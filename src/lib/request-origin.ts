/** Origem pública da request (Vercel / proxy). Evita cair em localhost interno. */
export function getRequestOrigin(req: Request): string {
  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const xfProto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  if (xfHost) return `${xfProto}://${xfHost}`;

  const host = req.headers.get("host")?.trim();
  if (host) {
    const isLocal =
      host.startsWith("localhost") ||
      host.startsWith("127.0.0.1") ||
      host.startsWith("[::1]");
    const proto =
      req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (isLocal ? "http" : "https");
    return `${proto}://${host}`;
  }

  return new URL(req.url).origin;
}
