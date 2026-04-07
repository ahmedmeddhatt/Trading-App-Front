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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieHeader = req.headers.get("cookie") ?? "";
  const userId = await getBackendUserId(cookieHeader);
  if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const res = await fetchBackend(
    `/transactions/${id}/user/${userId}`,
    { method: "DELETE" },
    cookieHeader
  );
  const body = await res.json();
  return NextResponse.json({ success: true, data: body.data ?? body }, { status: res.status });
}
