"use client";

import { ProcessedStockResponse } from "@/lib/types/alphaVantageResponse";
import { useEffect, useState } from "react";
import Header from "../ui/Header";

export default function Page() {
  const [stockData, setStockData] = useState<ProcessedStockResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState("AAPL"); // Default APPLE stocks edit this later

  /**
   * fetch stock data from current company
   * @param stockSymbol company's short symbol
   */
  const fetchStockData = async (stockSymbol: string) => {
    setLoading(true);
    setError(null);

    try {
      //Call my api for fetching daily stock data
      const response = await fetch(`/api/stocks?symbol=${stockSymbol}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch data");
      }

      const data: ProcessedStockResponse = await response.json();
      setStockData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Frontend Error:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchStockData(symbol);
  }, []);

  /**
   * Update when symbol changed
   */
  const handleSymbolChange = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newSymbol = formData.get("symbol") as string;
    if (newSymbol) {
      setSymbol(newSymbol.toUpperCase());
      fetchStockData(newSymbol);
    }
  };

  return (
    <>
      {/* Header */}
      <Header />
      <main className="container mx-auto p-6">
        {/* Search Form */}
        <div className="mb-6">
          <form onSubmit={handleSymbolChange} className="flex gap-2 max-w-md">
            <input
              type="text"
              name="symbol"
              placeholder="Enter stock symbol (e.g., AAPL)"
              className="border border-gray-300 rounded px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue={symbol}
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : "Search"}
            </button>
          </form>
        </div>
        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">
              Fetching stock data for {symbol}...
            </p>
          </div>
        )}
        {/* Error State */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer">Debug Info</summary>
              <p>Symbol: {symbol}</p>
              <p>Check console for more details</p>
            </details>
          </div>
        )}

        {/* Success State - Display Data */}
        {stockData && !loading && (
          <div className="space-y-6">
            {/* Metadata Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border">
              <h3 className="text-xl font-bold mb-4 text-gray-800">
                Stock Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded shadow-sm">
                  <span className="text-sm text-gray-600">Symbol</span>
                  <p className="font-bold text-lg">
                    {stockData.metadata.symbol}
                  </p>
                </div>
                <div className="bg-white p-3 rounded shadow-sm">
                  <span className="text-sm text-gray-600">Last Refreshed</span>
                  <p className="font-medium">
                    {stockData.metadata.lastRefreshed}
                  </p>
                </div>
                <div className="bg-white p-3 rounded shadow-sm">
                  <span className="text-sm text-gray-600">Time Zone</span>
                  <p className="font-medium">{stockData.metadata.timeZone}</p>
                </div>
              </div>
            </div>

            {/* Latest Price Highlight */}
            {stockData.data.length > 0 && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">
                  Latest Trading Day ({stockData.data[0].date})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-green-600">Close</span>
                    <p className="text-xl font-bold text-green-800">
                      ${stockData.data[0].close.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-green-600">High</span>
                    <p className="text-lg font-semibold">
                      ${stockData.data[0].high.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-green-600">Low</span>
                    <p className="text-lg font-semibold">
                      ${stockData.data[0].low.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-green-600">Volume</span>
                    <p className="text-lg font-semibold">
                      {stockData.data[0].volume.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Historical Data Table */}
            <div className="bg-white border rounded-lg overflow-hidden shadow">
              <div className="bg-gray-50 px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-800">
                  Historical Data (Last 15 Days)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Open
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        High
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Low
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Close
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Volume
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stockData.data.slice(0, 15).map((day, index) => (
                      <tr
                        key={day.date}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {day.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          ${day.open.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          ${day.high.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          ${day.low.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          ${day.close.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {day.volume.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
