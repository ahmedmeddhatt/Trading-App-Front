# EGX Trading App — Frontend

A Next.js 16 frontend for the EGX (Egyptian Stock Exchange) real-time trading platform.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 + TypeScript |
| Styling | Tailwind CSS |
| State | Zustand (URL-synced active symbol) |
| Server State | TanStack React Query v5 |
| Charts | Recharts v3 |
| Live Prices | Server-Sent Events (SSE) |
| Toasts | Sonner |
| Icons | Lucide React |

---

## Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Market status bar, hottest/recommended/lowest/my stocks with live prices |
| `/stocks` | Searchable stock table with sector filter, P/E filter, signal pills, watchlist, pagination |
| `/stocks/[symbol]` | Signal cards (daily/weekly/monthly), Recharts price chart with range tabs, day picker, buy/sell form with fees |
| `/portfolio` | Positions table with 30-day sparklines, analytics, timeline chart, allocation donut charts |
| `/dashboard/[symbol]` | Legacy per-symbol trading view (portfolio + trade form) |
| `/login` | Email/password login |
| `/register` | Account creation (name, email, password) |

---

## Architecture

```
Browser
  └─ /dashboard          → GET /api/stocks/dashboard  → backend /stocks/dashboard
  └─ /stocks             → GET /api/stocks             → backend /stocks (search/filter/page)
  └─ /stocks/[symbol]    → GET /api/stocks/[symbol]   → backend /stocks/:symbol
  └─ /portfolio          → GET /api/portfolio          → backend /portfolio/:userId
                           GET /api/portfolio/analytics → backend /portfolio/:userId/analytics
  └─ SSE price ticker    → GET /api/prices?symbol=X   → backend /api/prices?symbol=X (proxied)
  └─ Trade form          → POST /api/trade             → backend /transactions (+ fees field)

Next.js API Routes (thin proxies)
  ├─ /api/auth/*              — login, register, logout, me  (Set-Cookie forwarding)
  ├─ /api/prices              — SSE proxy: streams backend Redis PubSub (passes changePercent through)
  ├─ /api/prices/history/[symbol] — historical prices (backend /stocks/:symbol/history)
  ├─ /api/market-status       — backend /health → marketStatus field (30s cache)
  ├─ /api/portfolio           — positions + live P&L
  ├─ /api/portfolio/analytics — realized/unrealized/graphData
  ├─ /api/portfolio/timeline  — portfolio value over time (?from=&to=)
  ├─ /api/portfolio/allocation — sector + symbol allocation
  ├─ /api/portfolio/stock/[symbol]/history — per-symbol transaction history
  ├─ /api/stocks/dashboard    — hottest/recommended/lowest/myStocks
  ├─ /api/stocks/[symbol]     — stock detail (backend /stocks/:symbol directly)
  └─ /api/trade               — POST transaction with userId + fees injection
```

---

## Key Hooks & Stores

| File | Purpose |
|------|---------|
| `src/hooks/usePriceStream.ts` | `usePriceStream(symbols[])` — one SSE per symbol, exponential backoff, updates React Query cache |
| `src/hooks/useMarketStatus.ts` | Live EGX market status + countdown (updates every 1s, client-side UTC+2) |
| `src/store/useActiveStock.ts` | Zustand store with two-way URL↔state sync (`/dashboard/[symbol]`) |
| `src/features/portfolio/hooks/usePortfolio.ts` | React Query — polls `/api/portfolio` every 30s |
| `src/features/trade/hooks/useTrade.ts` | Mutation with idempotency UUID, forwards fees, invalidates portfolio on success |

---

## Key Utilities

| File | Purpose |
|------|---------|
| `src/lib/marketHours.ts` | `getMarketStatus()`, `formatCountdown()` — EGX hours Sun–Thu 10:00–14:30 UTC+2 |
| `src/lib/rangeToFromTo.ts` | Converts `1W/1M/3M/6M/1Y` tab to `?from=&to=` ISO date params |
| `src/lib/priceUtils.ts` | `formatPriceAge()`, `getPriceFreshness()` |
| `src/lib/proxy.ts` | `fetchBackend()`, `getBackendUserId()`, `passThrough()` |
| `src/lib/decodeJwt.ts` | `getUserIdFromCookieHeader()` — extracts `sub` from JWT without network call |
| `src/lib/apiClient.ts` | Typed fetch wrapper — parses `{ success, data, error }` envelope, auto-redirects on 401 |

---

## Trade Form

The buy/sell form includes:
- Editable price field (pre-filled with live SSE price, "Use live" button to re-sync)
- Brokerage fee field (auto-computed at **0.175%** of `qty × price`, user-editable)
- Live total = `qty × price + fees`
- Two-step review → confirm flow

---

## Public Routes (no auth required)

`/dashboard`, `/stocks`, `/stocks/*`, `/api/stocks/*`, `/api/prices/*`, `/api/market-status`, `/login`, `/register`, `/api/auth/*`

---

## Environment

```env
# .env.local
BACKEND_URL=https://trading-app-production-8775.up.railway.app
```

---

## Local Development

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build check
```

---

## Auth Flow

1. `POST /api/auth/register` or `POST /api/auth/login` → backend sets JWT cookie
2. `src/middleware.ts` guards private routes — redirects unauthenticated to `/login?next=...`
3. All API proxy routes forward the cookie header to the backend
4. `401` responses auto-redirect to `/login` via `apiClient.ts`

---

## Backend

Production: `https://trading-app-production-8775.up.railway.app`

See backend repo for full API reference (NestJS + PostgreSQL + Redis).
