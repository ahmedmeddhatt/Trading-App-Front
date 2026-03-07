import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/proxy";

export const revalidate = 30;

export async function GET() {
  try {
    const backendRes = await fetchBackend("/health");

    if (!backendRes.ok) {
      return NextResponse.json(
        { success: true, data: null },
        { status: 200 }
      );
    }

    const body = await backendRes.json();
    const marketStatus = body?.data?.marketStatus ?? body?.marketStatus ?? null;

    return NextResponse.json({ success: true, data: marketStatus });
  } catch {
    return NextResponse.json(
      { success: true, data: null },
      { status: 200 }
    );
  }
}
