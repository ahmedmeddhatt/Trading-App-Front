import { NextRequest } from "next/server";
import { fetchBackend, passThrough } from "@/lib/proxy";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const backendRes = await fetchBackend(
    "/auth/register",
    { method: "POST", body },
    req.headers.get("cookie") ?? undefined
  );
  return passThrough(backendRes);
}
