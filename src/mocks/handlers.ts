import { rest } from "msw";
import {
  mockPortfolio,
  mockAnalytics,
  mockTimeline,
  mockAllocation,
  mockHistory,
  mockStocks,
  mockDashboard,
} from "./data";

export const handlers = [
  rest.get("/api/portfolio", (_req, res, ctx) =>
    res(ctx.json({ success: true, data: mockPortfolio }))
  ),
  rest.get("/api/portfolio/analytics", (_req, res, ctx) =>
    res(ctx.json({ success: true, data: mockAnalytics }))
  ),
  rest.get("/api/portfolio/timeline", (_req, res, ctx) =>
    res(ctx.json({ success: true, data: mockTimeline }))
  ),
  rest.get("/api/portfolio/allocation", (_req, res, ctx) =>
    res(ctx.json({ success: true, data: mockAllocation }))
  ),
  rest.get("/api/portfolio/stock/:symbol/history", (_req, res, ctx) =>
    res(ctx.json({ success: true, data: mockHistory }))
  ),
  rest.get("/api/stocks/dashboard", (_req, res, ctx) =>
    res(ctx.json({ success: true, data: mockDashboard }))
  ),
  rest.get("/api/stocks", (_req, res, ctx) =>
    res(ctx.json({ success: true, data: mockStocks }))
  ),
  rest.get("/api/stocks/:symbol", (req, res, ctx) => {
    const { symbol } = req.params;
    const found = mockStocks.stocks.find((s) => s.symbol === symbol);
    if (!found) return res(ctx.status(404), ctx.json({ success: false, message: "Not found" }));
    return res(ctx.json({ success: true, data: found }));
  }),
];
