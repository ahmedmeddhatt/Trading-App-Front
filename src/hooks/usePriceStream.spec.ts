import { renderHook, act } from "@testing-library/react";
import { usePriceStream } from "./usePriceStream";
import { createWrapper } from "@/mocks/wrapper";

// ─── Mock EventSource ─────────────────────────────────────────────────────────

interface MockES {
  url: string;
  onmessage: ((e: { data: string }) => void) | null;
  onerror: (() => void) | null;
  close: jest.Mock;
  readyState: number;
}

const instances: MockES[] = [];

class FakeEventSource implements MockES {
  url: string;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  close = jest.fn();
  readyState = 1;

  constructor(url: string) {
    this.url = url;
    instances.push(this);
  }
}

beforeAll(() => {
  global.EventSource = FakeEventSource as unknown as typeof EventSource;
});

beforeEach(() => {
  instances.length = 0;
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

function makeEnvelope(symbol: string, price: number) {
  return JSON.stringify({
    success: true,
    data: { symbol, price, change: 0, changePercent: 0, timestamp: Date.now() },
  });
}

describe("usePriceStream", () => {
  it("opens one EventSource per unique symbol", () => {
    renderHook(() => usePriceStream(["COMI", "HRHO"]), { wrapper: createWrapper() });
    expect(instances).toHaveLength(2);
  });

  it("does not open duplicate connections for repeated symbols", () => {
    renderHook(() => usePriceStream(["COMI", "COMI"]), { wrapper: createWrapper() });
    expect(instances).toHaveLength(1);
  });

  it("updates prices when message received", () => {
    const { result } = renderHook(() => usePriceStream(["COMI"]), {
      wrapper: createWrapper(),
    });

    act(() => {
      instances[0].onmessage?.({ data: makeEnvelope("COMI", 55.5) });
    });

    expect(result.current.prices["COMI"]?.price).toBe(55.5);
  });

  it("closes EventSource on unmount", () => {
    const { unmount } = renderHook(() => usePriceStream(["COMI"]), {
      wrapper: createWrapper(),
    });
    unmount();
    expect(instances[0].close).toHaveBeenCalled();
  });

  it("closes all EventSources on unmount when multiple symbols", () => {
    const { unmount } = renderHook(() => usePriceStream(["COMI", "HRHO"]), {
      wrapper: createWrapper(),
    });
    unmount();
    instances.forEach((es) => expect(es.close).toHaveBeenCalled());
  });

  it("reconnects with exponential backoff after error", () => {
    renderHook(() => usePriceStream(["COMI"]), { wrapper: createWrapper() });
    const first = instances[0];

    act(() => { first.onerror?.(); });
    act(() => { jest.advanceTimersByTime(1000); });

    expect(instances).toHaveLength(2); // new connection created
  });

  it("reconnects with doubled delay on second error", () => {
    renderHook(() => usePriceStream(["COMI"]), { wrapper: createWrapper() });

    // first error
    act(() => { instances[0].onerror?.(); });
    act(() => { jest.advanceTimersByTime(1000); });
    expect(instances).toHaveLength(2);

    // second error — needs 2000ms
    act(() => { instances[1].onerror?.(); });
    act(() => { jest.advanceTimersByTime(999); });
    expect(instances).toHaveLength(2); // not yet reconnected
    act(() => { jest.advanceTimersByTime(1001); });
    expect(instances).toHaveLength(3);
  });

  it("opens new connection when symbol is added to array", () => {
    const { rerender } = renderHook(
      ({ syms }: { syms: string[] }) => usePriceStream(syms),
      { wrapper: createWrapper(), initialProps: { syms: ["COMI"] } }
    );
    expect(instances).toHaveLength(1);

    rerender({ syms: ["COMI", "HRHO"] });
    expect(instances).toHaveLength(2);
  });

  it("closes connection when symbol is removed from array", () => {
    const { rerender } = renderHook(
      ({ syms }: { syms: string[] }) => usePriceStream(syms),
      {
        wrapper: createWrapper(),
        initialProps: { syms: ["COMI", "HRHO"] },
      }
    );
    const hrhoEs = instances.find((es) => es.url.includes("HRHO"))!;
    rerender({ syms: ["COMI"] });
    expect(hrhoEs.close).toHaveBeenCalled();
  });

  it("loading is true until first price received", () => {
    const { result } = renderHook(() => usePriceStream(["COMI"]), {
      wrapper: createWrapper(),
    });
    expect(result.current.loading).toBe(true);

    act(() => {
      instances[0].onmessage?.({ data: makeEnvelope("COMI", 55) });
    });
    expect(result.current.loading).toBe(false);
  });

  it("ignores malformed SSE messages", () => {
    const { result } = renderHook(() => usePriceStream(["COMI"]), {
      wrapper: createWrapper(),
    });
    act(() => {
      instances[0].onmessage?.({ data: "not-json" });
    });
    expect(result.current.prices["COMI"]).toBeUndefined();
  });
});
