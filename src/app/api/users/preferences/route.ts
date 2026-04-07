import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";

export async function PATCH(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const body = await req.json();
  const res = await fetchBackend("/users/preferences", {
    method: "PATCH",
    body: JSON.stringify(body),
  }, cookieHeader);
  const data = await res.json();
  return NextResponse.json({ success: res.ok, data: data.data ?? data }, { status: res.status });
}
