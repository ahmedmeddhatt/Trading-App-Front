import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const { categoryId } = await params;
  const cookieHeader = req.headers.get("cookie") ?? "";
  const backendRes = await fetchBackend(`/gold/${categoryId}`, {}, cookieHeader);
  const body = await backendRes.json();
  return NextResponse.json(
    { success: backendRes.ok, data: body.data ?? body },
    { status: backendRes.status }
  );
}
