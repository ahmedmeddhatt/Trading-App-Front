import { renderHook, waitFor } from "@testing-library/react";
import { rest } from "msw";
import { server } from "@/mocks/server";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { createWrapper } from "@/mocks/wrapper";
import { mockTimeline } from "@/mocks/data";
import { rangeToFromTo, type DateRange } from "@/lib/rangeToFromTo";

function useTimeline(range: DateRange) {
  const { from, to } = rangeToFromTo(range);
  return useQuery({
    queryKey: ["portfolio", "timeline", range],
    queryFn: () =>
      apiClient.get(`/api/portfolio/timeline?from=${from}&to=${to}`),
    retry: false,
  });
}

const TODAY = new Date("2025-06-15T12:00:00.000Z");

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(TODAY);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useTimeline", () => {
  it("fetches /api/portfolio/timeline with from and to params for '1W'", async () => {
    let capturedUrl = "";
    server.use(
      rest.get("/api/portfolio/timeline", (req, res, ctx) => {
        capturedUrl = req.url.toString();
        return res(ctx.json({ success: true, data: mockTimeline }));
      })
    );

    const { result } = renderHook(() => useTimeline("1W"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const url = new URL(capturedUrl);
    expect(url.searchParams.get("from")).toBe("2025-06-08");
    expect(url.searchParams.get("to")).toBe("2025-06-15");
  });

  it("from and to params are ISO date strings (YYYY-MM-DD)", async () => {
    let capturedUrl = "";
    server.use(
      rest.get("/api/portfolio/timeline", (req, res, ctx) => {
        capturedUrl = req.url.toString();
        return res(ctx.json({ success: true, data: mockTimeline }));
      })
    );

    const { result } = renderHook(() => useTimeline("1M"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const url = new URL(capturedUrl);
    const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    expect(url.searchParams.get("from")).toMatch(ISO_DATE_RE);
    expect(url.searchParams.get("to")).toMatch(ISO_DATE_RE);
  });

  it("'1M' sends from = 30 days before today", async () => {
    let capturedUrl = "";
    server.use(
      rest.get("/api/portfolio/timeline", (req, res, ctx) => {
        capturedUrl = req.url.toString();
        return res(ctx.json({ success: true, data: mockTimeline }));
      })
    );

    const { result } = renderHook(() => useTimeline("1M"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const url = new URL(capturedUrl);
    expect(url.searchParams.get("from")).toBe("2025-05-16");
    expect(url.searchParams.get("to")).toBe("2025-06-15");
  });

  it("range tab change triggers new fetch with updated from/to", async () => {
    const urls: string[] = [];
    server.use(
      rest.get("/api/portfolio/timeline", (req, res, ctx) => {
        urls.push(req.url.toString());
        return res(ctx.json({ success: true, data: mockTimeline }));
      })
    );

    const { result, rerender } = renderHook(
      ({ range }: { range: DateRange }) => useTimeline(range),
      { wrapper: createWrapper(), initialProps: { range: "1W" } }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ range: "3M" });
    await waitFor(() => expect(urls).toHaveLength(2));

    const url3M = new URL(urls[1]);
    expect(url3M.searchParams.get("from")).toBe("2025-03-17");
  });

  it("returns timeline data array on success", async () => {
    const { result } = renderHook(() => useTimeline("1W"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});
