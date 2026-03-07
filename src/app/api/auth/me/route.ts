import { NextRequest } from "next/server";
import { fetchBackend, passThrough } from "@/lib/proxy";

export async function GET(req: NextRequest) {
  const backendRes = await fetchBackend(
    "/auth/me",
    {},
    req.headers.get("cookie") ?? undefined
  );
  return passThrough(backendRes);
}
