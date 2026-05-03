import { redirect } from "next/navigation";

// /portfolio/positions/[symbol] is folded into /stocks/[symbol]; the merged page
// renders the OwnedPositionPanel inline when the user has any history with the symbol.
export default async function PositionDetailRedirect({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  redirect(`/stocks/${symbol}`);
}
