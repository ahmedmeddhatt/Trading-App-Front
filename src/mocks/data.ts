export const mockPositions = [
  {
    symbol: "COMI",
    quantity: 100,
    avgCost: 50,
    currentPrice: 55,
    pnl: 500,
    pnlPercent: 10,
  },
  {
    symbol: "HRHO",
    quantity: 50,
    avgCost: 120,
    currentPrice: 110,
    pnl: -500,
    pnlPercent: -8.33,
  },
];

export const mockPortfolio = {
  totalValue: 11000,
  totalPnl: 0,
  totalPnlPercent: 0,
  positions: mockPositions,
};

export const mockAnalytics = {
  positions: [
    {
      symbol: "COMI",
      totalQuantity: 100,
      averagePrice: "50.00",
      totalInvested: "5000.00",
      currentPrice: 55,
      unrealizedPnL: "500.00",
      realizedPnL: "0.00",
      returnPercent: "10.00",
    },
    {
      symbol: "HRHO",
      totalQuantity: 50,
      averagePrice: "120.00",
      totalInvested: "6000.00",
      currentPrice: 110,
      unrealizedPnL: "-500.00",
      realizedPnL: "200.00",
      returnPercent: "-8.33",
    },
  ],
  portfolioValue: {
    totalInvested: "11000.00",
    totalRealized: "200.00",
    totalUnrealized: "0.00",
    totalPnL: "200.00",
  },
  bestPerformer: { symbol: "COMI", return: 10, pnl: 500 },
  worstPerformer: { symbol: "HRHO", return: -8.33, pnl: -500 },
};

export const mockTimeline = [
  { timestamp: "2025-01-01T00:00:00Z", totalValue: 10000 },
  { timestamp: "2025-01-08T00:00:00Z", totalValue: 10500 },
  { timestamp: "2025-01-15T00:00:00Z", totalValue: 11000 },
];

export const mockAllocation = {
  bySector: [
    { name: "Banking", value: 5500, percentage: 50 },
    { name: "Real Estate", value: 5500, percentage: 50 },
  ],
  bySymbol: [
    { name: "COMI", value: 5500, percentage: 50 },
    { name: "HRHO", value: 5500, percentage: 50 },
  ],
};

export const mockHistory = {
  transactions: [
    {
      type: "BUY" as const,
      quantity: 100,
      price: 50,
      timestamp: "2025-01-01T10:00:00Z",
      total: 5000,
    },
    {
      type: "SELL" as const,
      quantity: 20,
      price: 55,
      timestamp: "2025-02-01T10:00:00Z",
      total: 1100,
    },
  ],
  summary: {
    totalBought: 5000,
    totalSold: 1100,
    netFlow: -3900,
  },
};

export const mockStocks = {
  stocks: [
    { symbol: "COMI", name: "Commercial International Bank", price: 55, changePercent: 1.5, sector: "Banking", pe: 12.5 },
    { symbol: "HRHO", name: "Heliopolis Housing", price: 110, changePercent: -2.1, sector: "Real Estate", pe: 8.3 },
    { symbol: "EKHC", name: "Eastern Co.", price: 18, changePercent: 0.5, sector: "Consumer", pe: 15.2 },
  ],
  total: 3,
};

export const mockDashboard = {
  hottest: [{ symbol: "COMI", price: 55, changePercent: 1.5 }],
  recommended: [{ symbol: "HRHO", price: 110, changePercent: -2.1 }],
  lowest: [{ symbol: "EKHC", price: 18, changePercent: 0.5 }],
  myStocks: [
    { symbol: "COMI", totalQuantity: 100, averagePrice: 50, totalInvested: 5000, price: 55 },
  ],
};
