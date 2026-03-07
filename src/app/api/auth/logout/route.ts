import { NextRequest } from "next/server";
import { fetchBackend, passThrough } from "@/lib/proxy";

export async function POST(req: NextRequest) {
  const backendRes = await fetchBackend(
    "/auth/logout",
    { method: "POST", body: "{}" },
    req.headers.get("cookie") ?? undefined
  );
  return passThrough(backendRes);
}
