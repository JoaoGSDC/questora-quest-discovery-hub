/** Origem pública da request (Vercel / proxy). Evita cair em localhost interno. */
export function getRequestOrigin(req: Request): string {
  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const xfProto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";

  // Em produção na Vercel, nunca confiar em origin "localhost" do request.url.
  const vercelUrl = process.env["VERCEL_URL"]?.replace(/\/$/, "");
  const onVercel = process.env["VERCEL"] === "1" || !!vercelUrl;

  if (xfHost) {
    const isLocalXf =
      xfHost.startsWith("localhost") ||
      xfHost.startsWith("127.0.0.1") ||
      xfHost.startsWith("[::1]");
    if (isLocalXf && onVercel && vercelUrl) {
      return `https://${vercelUrl}`;
    }
    return `${xfProto}://${xfHost}`;
  }

  const host = req.headers.get("host")?.trim();
  if (host) {
    const isLocal =
      host.startsWith("localhost") ||
      host.startsWith("127.0.0.1") ||
      host.startsWith("[::1]");
    if (isLocal && onVercel && vercelUrl) {
      return `https://${vercelUrl}`;
    }
    const proto =
      req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (isLocal ? "http" : "https");
    return `${proto}://${host}`;
  }

  const origin = new URL(req.url).origin;
  if (onVercel && vercelUrl && origin.includes("localhost")) {
    return `https://${vercelUrl}`;
  }
  return origin;
}
