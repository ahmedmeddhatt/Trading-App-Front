import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_URL ?? "https://trading-app-production-8775.up.railway.app";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase() ?? "COMI";
  const cookieHeader = req.headers.get("cookie") ?? "";
  const backendUrl = `${BACKEND}/api/prices?symbol=${encodeURIComponent(symbol)}`;

  const stream = new ReadableStream({
    start(controller) {
      (async () => {
        const enc = new TextEncoder();

        try {
          const backendRes = await fetch(backendUrl, {
            headers: { Cookie: cookieHeader },
            signal: req.signal,
          });

          if (!backendRes.ok || !backendRes.body) {
            controller.close();
            return;
          }

          const reader = backendRes.body.getReader();
          const dec = new TextDecoder();
          let buf = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buf += dec.decode(value, { stream: true });
              const lines = buf.split("\n");
              buf = lines.pop() ?? "";

              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const raw = line.slice(5).trim();
                if (!raw) continue;
                // Pass raw event data through unchanged
                controller.enqueue(enc.encode(`data: ${raw}\n\n`));
              }
            }
          } finally {
            try { reader.cancel(); } catch {}
          }
        } catch (err) {
          const isAbort =
            err instanceof Error &&
            (err.name === "AbortError" || err.message.includes("aborted"));
          if (!isAbort) {
            try { controller.error(err); } catch {}
            return;
          }
        }

        try { controller.close(); } catch {}
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
