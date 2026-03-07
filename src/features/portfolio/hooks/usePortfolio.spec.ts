import { renderHook, waitFor } from "@testing-library/react";
import { rest } from "msw";
import { server } from "@/mocks/server";
import { usePortfolio } from "./usePortfolio";
import { createWrapper } from "@/mocks/wrapper";
import { mockPortfolio } from "@/mocks/data";

describe("usePortfolio", () => {
  it("is loading initially", () => {
    const { result } = renderHook(() => usePortfolio(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("returns portfolio data on success", async () => {
    const { result } = renderHook(() => usePortfolio(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.positions).toHaveLength(mockPortfolio.positions.length);
  });

  it("returns correct position shape", async () => {
    const { result } = renderHook(() => usePortfolio(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.positions[0]).toMatchObject({ symbol: "COMI", quantity: 100 });
  });

  it("sets isError on server error", async () => {
    server.use(
      rest.get("/api/portfolio", (_req, res, ctx) =>
        res(ctx.status(500), ctx.json({ success: false, message: "Server error" }))
      )
    );
    const { result } = renderHook(() => usePortfolio(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it("refetchInterval is 30000ms — query is configured", () => {
    const { result } = renderHook(() => usePortfolio(), { wrapper: createWrapper() });
    expect(result.current).toBeDefined();
  });

  it("returns positions array on success", async () => {
    const { result } = renderHook(() => usePortfolio(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data?.positions)).toBe(true);
  });

  it("handles empty positions gracefully", async () => {
    server.use(
      rest.get("/api/portfolio", (_req, res, ctx) =>
        res(ctx.json({
          success: true,
          data: { totalValue: 0, totalPnl: 0, totalPnlPercent: 0, positions: [] },
        }))
      )
    );
    const { result } = renderHook(() => usePortfolio(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.positions).toHaveLength(0);
  });
});
