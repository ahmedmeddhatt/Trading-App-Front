import { NextRequest, NextResponse } from "next/server";
import { fetchBackend, getBackendUserId } from "@/lib/proxy";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieHeader = req.headers.get("cookie") ?? "";
  const userId = await getBackendUserId(cookieHeader);
  if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const res = await fetchBackend(`/portfolio/${userId}/transactions/${id}/detail`, {}, cookieHeader);
  return NextResponse.json(await res.json(), { status: res.status });
}
