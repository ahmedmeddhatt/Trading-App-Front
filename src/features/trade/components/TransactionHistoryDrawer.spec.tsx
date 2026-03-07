import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { rest } from "msw";
import { server } from "@/mocks/server";
import { createWrapper } from "@/mocks/wrapper";
import TransactionHistoryDrawer from "./TransactionHistoryDrawer";
import { mockHistory } from "@/mocks/data";

const SYMBOL = "COMI";

function renderDrawer(open: boolean, onClose = jest.fn()) {
  return render(
    <TransactionHistoryDrawer symbol={SYMBOL} open={open} onClose={onClose} />,
    { wrapper: createWrapper() }
  );
}

describe("TransactionHistoryDrawer", () => {
  it("is translated off-screen when closed", () => {
    const { container } = renderDrawer(false);
    expect(container.querySelector(".translate-x-full")).toBeInTheDocument();
  });

  it("slides in when open", () => {
    const { container } = renderDrawer(true);
    expect(container.querySelector(".translate-x-0")).toBeInTheDocument();
  });

  it("shows the symbol name when open", () => {
    renderDrawer(true);
    expect(screen.getByText(SYMBOL)).toBeInTheDocument();
  });

  it("shows a loading spinner while fetching", () => {
    server.use(
      rest.get("/api/portfolio/stock/:symbol/history", async (_req, res, ctx) => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return res(ctx.json({ success: true, data: mockHistory }));
      })
    );
    renderDrawer(true);
    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });

  it("renders BUY and SELL transaction rows when loaded", async () => {
    renderDrawer(true);
    await waitFor(() => {
      expect(screen.getByText("BUY")).toBeInTheDocument();
      expect(screen.getByText("SELL")).toBeInTheDocument();
    });
  });

  it("shows quantity for each transaction", async () => {
    renderDrawer(true);
    await waitFor(() => {
      expect(screen.getByText(/100 shares/)).toBeInTheDocument();
      expect(screen.getByText(/20 shares/)).toBeInTheDocument();
    });
  });

  it("shows footer totals from summary when available", async () => {
    renderDrawer(true);
    await waitFor(() => {
      expect(screen.getByText(/Total bought/i)).toBeInTheDocument();
      expect(screen.getByText(/Total sold/i)).toBeInTheDocument();
    });
  });

  it("falls back to client-calculated totals when summary is absent", async () => {
    server.use(
      rest.get("/api/portfolio/stock/:symbol/history", (_req, res, ctx) =>
        res(ctx.json({ success: true, data: { transactions: mockHistory.transactions } }))
      )
    );
    renderDrawer(true);
    await waitFor(() => {
      expect(screen.getByText(/Total bought/i)).toBeInTheDocument();
      expect(screen.getAllByText(/5000|5,000/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows 'No transactions' when array is empty", async () => {
    server.use(
      rest.get("/api/portfolio/stock/:symbol/history", (_req, res, ctx) =>
        res(ctx.json({ success: true, data: { transactions: [] } }))
      )
    );
    renderDrawer(true);
    await waitFor(() => {
      expect(screen.getByText(/No transactions yet/i)).toBeInTheDocument();
    });
  });

  it("calls onClose when Escape key is pressed", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    renderDrawer(true, onClose);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the X button is clicked", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    renderDrawer(true, onClose);
    await user.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("BUY rows have green badge, SELL rows have red badge", async () => {
    renderDrawer(true);
    await waitFor(() => screen.getByText("BUY"));
    expect(screen.getByText("BUY").className).toMatch(/emerald/);
    expect(screen.getByText("SELL").className).toMatch(/red/);
  });

  it("does not fetch while drawer is closed", () => {
    const fetchSpy = jest.fn();
    server.use(
      rest.get("/api/portfolio/stock/:symbol/history", (_req, res, ctx) => {
        fetchSpy();
        return res(ctx.json({ success: true, data: mockHistory }));
      })
    );
    renderDrawer(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
