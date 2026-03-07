/** Extract userId from access_token JWT cookie without network call.
 *  JWT sub claim holds the userId. No verification needed (server trusts its own tokens). */
export function getUserIdFromCookieHeader(cookieHeader: string): string | null {
  const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
  if (!match) return null;
  try {
    const payload = match[1].split(".")[1];
    if (!payload) return null;
    const json = Buffer.from(
      payload.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");
    const data = JSON.parse(json) as Record<string, unknown>;
    return (data.sub as string) ?? null;
  } catch {
    return null;
  }
}
