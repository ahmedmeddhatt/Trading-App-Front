import { NextRequest } from "next/server";
import { GET } from "./route";

// Mock the backend fetch so we don't hit real network
const mockBackendFetch = jest.fn();

jest.mock("node-fetch", () => mockBackendFetch, { virtual: true });

// Override global fetch for the route's internal usage
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    body: {
      getReader: () => ({
        read: jest
          .fn()
          // Emit one SSE chunk then signal done
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"symbol":"COMI","price":55.5,"timestamp":1700000000000}\n\n'
            ),
          })
          .mockResolvedValue({ done: true, value: undefined }),
        cancel: jest.fn(),
      }),
    },
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function makeRequest(symbol = "COMI", cookie = "") {
  const req = new NextRequest(
    `http://localhost/api/prices?symbol=${symbol}`,
    { headers: { cookie } }
  );
  // Provide a signal that never aborts (so the stream can finish)
  return req;
}

describe("GET /api/prices", () => {
  it("returns Content-Type: text/event-stream", async () => {
    const res = await GET(makeRequest("COMI"));
    expect(res.headers.get("content-type")).toContain("text/event-stream");
  });

  it("returns 200 status", async () => {
    const res = await GET(makeRequest("COMI"));
    expect(res.status).toBe(200);
  });

  it("forwards symbol query param to backend URL", async () => {
    await GET(makeRequest("HRHO"));
    expect(global.fetch as jest.Mock).toHaveBeenCalledWith(
      expect.stringContaining("symbol=HRHO"),
      expect.anything()
    );
  });

  it("defaults to COMI when symbol is missing", async () => {
    const req = new NextRequest("http://localhost/api/prices", {
      headers: { cookie: "" },
    });
    await GET(req);
    expect(global.fetch as jest.Mock).toHaveBeenCalledWith(
      expect.stringContaining("symbol=COMI"),
      expect.anything()
    );
  });

  it("uppercases the symbol", async () => {
    await GET(makeRequest("comi"));
    expect(global.fetch as jest.Mock).toHaveBeenCalledWith(
      expect.stringContaining("symbol=COMI"),
      expect.anything()
    );
  });

  it("includes Cache-Control: no-cache header", async () => {
    const res = await GET(makeRequest());
    expect(res.headers.get("cache-control")).toContain("no-cache");
  });
});
