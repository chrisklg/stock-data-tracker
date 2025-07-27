"use client";

import { ProcessedStockResponse } from "@/lib/types/alphaVantageResponse";
import { useEffect, useState } from "react";
import Header from "../ui/Header";
import FavoriteButton from "../ui/FavoriteButton";
import FavoritesList from "../ui/FavoritesList";
import CandlestickChart from "../ui/CandlestickChart";

// Type for search results -
type SearchResult = {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
};

export default function Page() {
  const [stockData, setStockData] = useState<ProcessedStockResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState("AAPL"); // Default APPLE stocks

  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  /**
   * fetch stock data from current company
   * @param stockSymbol company's short symbol
   */
  const fetchStockData = async (stockSymbol: string) => {
    setLoading(true);
    setError(null);
    setShowSearchResults(false); // Hide search results when fetching

    try {
      // Call Next.js API
      const response = await fetch(
        `/api/stocks?symbol=${stockSymbol}&days=360`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch data");
      }

      const data: ProcessedStockResponse = await response.json();
      setStockData(data);
      console.log("Stock data received:", data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Frontend Error:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Search for stock symbols
   */
  const searchSymbols = async (keywords: string) => {
    if (!keywords.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/search?keywords=${encodeURIComponent(keywords)}`
      );

      if (!response.ok) {
        console.error("Search failed:", response.status);
        setSearchResults([]);
        return;
      }

      const results: SearchResult[] = await response.json();
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchStockData(symbol);
  }, []);

  /**
   * Handle search input changes
   */
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Debounce search
    const timeoutId = setTimeout(() => {
      if (query.length >= 2) {
        searchSymbols(query);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  /**
   * Handle selecting a search result
   */
  const handleSelectSearchResult = (
    selectedSymbol: string,
    companyName: string
  ) => {
    setSymbol(selectedSymbol);
    setSearchQuery(`${selectedSymbol} - ${companyName}`);
    setShowSearchResults(false);
    fetchStockData(selectedSymbol);
  };

  /**
   * Update when symbol changed via form submission
   */
  const handleSymbolChange = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newSymbol = formData.get("symbol") as string;
    if (newSymbol) {
      const symbolOnly = newSymbol.split(" ")[0].toUpperCase(); // Extract symbol if format is "AAPL - Apple"
      setSymbol(symbolOnly);
      fetchStockData(symbolOnly);
    }
  };

  /**
   * Handle selecting a stock from favorites
   */
  const handleSelectFromFavorites = (favoriteSymbol: string) => {
    setSymbol(favoriteSymbol);
    setSearchQuery(favoriteSymbol);
    fetchStockData(favoriteSymbol);
  };

  return (
    <>
      {/* Header */}
      <Header />
      <main className="w-full p-10">
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-1 space-y-6">
            {/* Enhanced Search Form */}
            <div className="mb-6">
              <form
                onSubmit={handleSymbolChange}
                className="flex gap-2 max-w-md relative"
              >
                <div className="flex-1 relative">
                  <input
                    type="text"
                    name="symbol"
                    placeholder="Search stocks (e.g., AAPL, Apple, Tesla)"
                    className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    autoComplete="off"
                  />

                  {/* Search Results Dropdown */}
                  {showSearchResults && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-b-md shadow-lg z-10 max-h-60 overflow-y-auto">
                      {isSearching ? (
                        <div className="p-3 text-gray-500">Searching...</div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((result) => (
                          <div
                            key={result.symbol}
                            className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() =>
                              handleSelectSearchResult(
                                result.symbol,
                                result.name
                              )
                            }
                          >
                            <div className="font-semibold text-blue-600">
                              {result.symbol}
                            </div>
                            <div className="text-sm text-gray-600 truncate">
                              {result.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {result.region} • {result.currency}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-gray-500">
                          No results found
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Loading..." : "Get Data"}
                </button>
              </form>
            </div>

            {/* Display Data */}
            {stockData && !loading && (
              <div className="space-y-6">
                {/* Metadata Card */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-800">
                      Stock Information
                    </h3>
                    <FavoriteButton
                      stock={{
                        symbol: stockData.metadata.symbol,
                        name: stockData.metadata.symbol,
                        lastPrice: stockData.data[0]?.close,
                      }}
                      size={28}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded shadow-sm">
                      <span className="text-sm text-gray-600">Symbol</span>
                      <p className="font-bold text-lg">
                        {stockData.metadata.symbol}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded shadow-sm">
                      <span className="text-sm text-gray-600">
                        Last Refreshed
                      </span>
                      <p className="font-medium">
                        {stockData.metadata.lastRefreshed}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded shadow-sm">
                      <span className="text-sm text-gray-600">Time Zone</span>
                      <p className="font-medium">
                        {stockData.metadata.timeZone}
                      </p>
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
              </div>
            )}
          </div>

          {/* Sidebar - Favorites */}
          <div className="lg:col-span-1">
            <FavoritesList
              onSelectStock={handleSelectFromFavorites}
              className="sticky top-6"
            />
          </div>

          {/* Candlestick Chart */}
          <CandlestickChart
            stockData={stockData}
            loading={loading}
            height={500}
          />
        </div>
      </main>
    </>
  );
}
