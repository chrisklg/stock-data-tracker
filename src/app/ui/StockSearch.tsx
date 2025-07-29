import { SearchResult } from "@/lib/types/searchResult";
import { useState } from "react";
import { useFavorites } from "../context/FavoritesContext";
import { useStockData } from "@/lib/util";

interface StockSearchProps {
  onBack?: () => void;
  onStockAdded?: () => void;
}

export default function StockSearch({
  onBack,
  onStockAdded,
}: StockSearchProps) {
  // Use the custom hook
  const {
    stockData,
    loading,
    error: stockError,
    fetchStock,
    clearData,
  } = useStockData();

  const [, setSymbol] = useState("");

  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const { addFavorite } = useFavorites();

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
    setSearchError(null);

    try {
      const response = await fetch(
        `/api/search?keywords=${encodeURIComponent(keywords)}`
      );

      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`);
      }

      const results: SearchResult[] = await response.json();
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (err) {
      console.error("Search error:", err);
      setSearchError("Failed to search stocks. Please try again.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Handle search input changes with debouncing
   */
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSearchError(null);
  };

  /**
   * Handle selecting a search result and fetch stock data
   */
  const handleSelectSearchResult = async (
    selectedSymbol: string,
    companyName: string
  ) => {
    setSymbol(selectedSymbol);
    setSearchQuery(`${selectedSymbol} - ${companyName}`);
    setShowSearchResults(false);
    setSearchError(null);

    try {
      await fetchStock(selectedSymbol);
    } catch (err) {
      // Error is already handled by the hook
      console.error("Failed to fetch stock data:", err);
    }
  };

  /**
   * Add current searched stock to favorites
   */
  const handleAddToFavorites = () => {
    if (!stockData) return;

    try {
      addFavorite({
        symbol: stockData.metadata.symbol,
        name: stockData.metadata.symbol,
        addedAt: new Date().toISOString(),
        lastPrice: stockData.data[0]?.close,
      });

      // Reset state
      resetSearchState();

      // Notify parent that stock was added
      onStockAdded?.();

      // Go back to dashboard
      onBack?.();
    } catch (err) {
      console.error("Failed to add to favorites:", err);
      setSearchError("Failed to add stock to favorites. Please try again.");
    }
  };

  /**
   * Reset all search-related state
   */
  const resetSearchState = () => {
    clearData();
    setSymbol("");
    setSearchQuery("");
    setSearchError(null);
    setSearchResults([]);
    setShowSearchResults(false);
  };

  /**
   * Handle going back to dashboard
   */
  const handleBack = () => {
    resetSearchState();
    onBack?.();
  };

  /**
   * Handle form submission for direct symbol entry
   */
  const handleSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newSymbol = formData.get("symbol") as string;

    if (newSymbol) {
      const symbolOnly = newSymbol.split(" ")[0].toUpperCase().trim();
      if (symbolOnly) {
        handleSelectSearchResult(symbolOnly, symbolOnly);
      }
    }
  };

  // Combine errors from search and stock fetching
  const displayError = searchError || stockError;

  return (
    <div className="w-full p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Dashboard
        </button>

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Add New Stock to Favorites
          </h2>

          {/* Search Form */}
          <form
            onSubmit={handleSymbolSubmit}
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
                disabled={loading}
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
                          handleSelectSearchResult(result.symbol, result.name)
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
                    <div className="p-3 text-gray-500">No results found</div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Loading..." : "Search"}
            </button>
          </form>
        </div>

        {/* Error State */}
        {displayError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {displayError}
            <button
              onClick={() => {
                setSearchError(null);
              }}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Loading stock data...</span>
            </div>
          </div>
        )}

        {/* Stock Preview */}
        {stockData && !loading && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {stockData.metadata.symbol}
                </h3>
                <p className="text-gray-600">
                  Preview before adding to favorites
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">
                  ${stockData.data[0]?.close.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">
                  Last updated: {stockData.metadata.lastRefreshed}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Open</div>
                <div className="font-semibold">
                  ${stockData.data[0]?.open.toFixed(2)}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">High</div>
                <div className="font-semibold">
                  ${stockData.data[0]?.high.toFixed(2)}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Low</div>
                <div className="font-semibold">
                  ${stockData.data[0]?.low.toFixed(2)}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Volume</div>
                <div className="font-semibold">
                  {stockData.data[0]?.volume.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleAddToFavorites}
                className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Add to Watchlist
              </button>
              <button
                onClick={handleBack}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
