import { NextRequest, NextResponse } from "next/server";
import { fetchBackend, getBackendUserId } from "@/lib/proxy";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";

  const userId = await getBackendUserId(cookieHeader);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: 401, message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const queryString = req.nextUrl.search;
  const backendRes = await fetchBackend(
    `/portfolio/${userId}/analytics${queryString}`,
    {},
    cookieHeader
  );

  if (!backendRes.ok) {
    return NextResponse.json({ success: true, data: null });
  }

  const body = await backendRes.json();
  return NextResponse.json({ success: true, data: body.data ?? body });
}
