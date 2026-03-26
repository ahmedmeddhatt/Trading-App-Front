export function computeBreakEvenGap(currentPrice: number | null, avgPrice: number): number | null {
  if (currentPrice == null || avgPrice === 0) return null;
  return ((currentPrice - avgPrice) / avgPrice) * 100;
}

export function computeHoldDays(firstBuyDate: string | Date): number {
  return Math.floor((Date.now() - new Date(firstBuyDate).getTime()) / 86400000);
}

export function computeAnnualizedReturn(returnPct: number, holdDays: number): number | null {
  if (holdDays < 1) return null;
  return (returnPct / 100) * (365 / holdDays) * 100;
}

export function gradeClosedTrade(returnPct: number, annualizedReturn: number | null): 'A' | 'B' | 'C' | 'D' {
  const ann = annualizedReturn ?? 0;
  if (returnPct >= 15 || ann >= 50) return 'A';
  if (returnPct >= 5 || ann >= 20) return 'B';
  if (returnPct >= 0) return 'C';
  return 'D';
}

export type LotEntry = {
  date: string;
  quantity: number;
  buyPrice: number;
  lotValue: number;
  isAboveBreakEven: boolean;
};

export function buildCostBasisLadder(
  buyTxns: { quantity: string; price: string; createdAt: string }[],
  totalQtyHeld: number,
  totalQtyBought: number,
  currentPrice: number | null,
): LotEntry[] {
  if (totalQtyBought === 0) return [];
  const heldFraction = totalQtyHeld / totalQtyBought;
  return buyTxns.map((t) => {
    const bp = parseFloat(t.price);
    const qty = parseFloat(t.quantity) * heldFraction;
    return {
      date: t.createdAt,
      quantity: parseFloat(qty.toFixed(4)),
      buyPrice: bp,
      lotValue: parseFloat((qty * bp).toFixed(2)),
      isAboveBreakEven: currentPrice != null ? bp < currentPrice : false,
    };
  });
}

export function computeHHI(positions: { value: number }[], totalValue: number): number {
  if (totalValue === 0) return 0;
  return positions.reduce((sum, p) => {
    const weight = (p.value / totalValue) * 100;
    return sum + weight * weight;
  }, 0);
}

export const GRADE_COLOR: Record<string, string> = {
  A: 'text-emerald-400',
  B: 'text-blue-400',
  C: 'text-amber-400',
  D: 'text-orange-400',
};

export const GRADE_BG: Record<string, string> = {
  A: 'bg-emerald-900/30 text-emerald-400',
  B: 'bg-blue-900/30 text-blue-400',
  C: 'bg-amber-900/30 text-amber-400',
  D: 'bg-orange-900/30 text-orange-400',
};

export function formatEGP(value: number | string | null | undefined): string {
  if (value == null) return '—';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2 }).format(n);
}

/** Like formatEGP but always prepends + for gains, − for losses — use for PnL fields. */
export function formatSignedEGP(value: number | string | null | undefined): string {
  if (value == null) return '—';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return '—';
  const abs = new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2 }).format(Math.abs(n));
  if (n > 0) return `+${abs}`;
  if (n < 0) return `−${abs}`;
  return abs;
}

export function formatPct(value: number | string | null | undefined, signed = true): string {
  if (value == null) return '—';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return '—';
  return `${signed && n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export function pnlColor(value: number | string | null | undefined): string {
  if (value == null) return 'text-gray-400';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-gray-400';
}
