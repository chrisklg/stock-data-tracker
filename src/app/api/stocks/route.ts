import { alphaVantageAPI } from "@/lib/stock-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return Response.json({ error: "Symbol is required" }, { status: 400 });
  }

  try {
    const stockData = await alphaVantageAPI.getDailyStockData(symbol);
    return Response.json(stockData);
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch stock data" },
      { status: 500 }
    );
  }
}
