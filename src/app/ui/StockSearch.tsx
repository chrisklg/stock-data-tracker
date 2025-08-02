import { SearchResult } from "@/lib/types/searchResult";
import { useState, useEffect, useRef } from "react";
import { useFavorites } from "../provider/FavoritesProvider";
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
  const [searchTakingLong, setSearchTakingLong] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { addFavorite } = useFavorites();

  /**
   * Search for stock symbols with enhanced search terms
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
      // Enhanced search with better encoding and error handling
      const encodedKeywords = encodeURIComponent(keywords.trim());
      const response = await fetch(`/api/search?keywords=${encodedKeywords}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Search failed with status: ${response.status}`
        );
      }

      const results: SearchResult[] = await response.json();

      // Filter and sort results for better relevance
      const filteredResults = results
        .filter((result) => result.symbol && result.name) // Ensure we have both symbol and name
        .sort((a, b) => {
          const queryLower = keywords.toLowerCase();
          const aSymbolMatch = a.symbol.toLowerCase().includes(queryLower);
          const bSymbolMatch = b.symbol.toLowerCase().includes(queryLower);
          const aNameMatch = a.name.toLowerCase().includes(queryLower);
          const bNameMatch = b.name.toLowerCase().includes(queryLower);

          // Prioritize exact symbol matches
          if (a.symbol.toLowerCase() === queryLower) return -1;
          if (b.symbol.toLowerCase() === queryLower) return 1;

          // Then symbol starts with query
          if (
            a.symbol.toLowerCase().startsWith(queryLower) &&
            !b.symbol.toLowerCase().startsWith(queryLower)
          )
            return -1;
          if (
            b.symbol.toLowerCase().startsWith(queryLower) &&
            !a.symbol.toLowerCase().startsWith(queryLower)
          )
            return 1;

          // Then any symbol match vs name match
          if (aSymbolMatch && !bSymbolMatch) return -1;
          if (bSymbolMatch && !aSymbolMatch) return 1;

          // Finally alphabetical by symbol
          return a.symbol.localeCompare(b.symbol);
        });

      setSearchResults(filteredResults);
      setShowSearchResults(true);
    } catch (err) {
      console.error("Search error:", err);

      if (err instanceof Error) {
        if (err.name === "TimeoutError") {
          setSearchError(
            "Search timeout - please try again with a shorter query."
          );
        } else if (err.message.includes("fetch")) {
          setSearchError("Network error - please check your connection.");
        } else {
          setSearchError(
            err.message || "Failed to search stocks. Please try again."
          );
        }
      } else {
        setSearchError("Failed to search stocks. Please try again.");
      }

      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Handle search input changes with improved debouncing
   */
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSearchError(null);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    if (query.trim().length >= 2) {
      // Only search if query is at least 2 characters
      searchTimeoutRef.current = setTimeout(() => {
        searchSymbols(query);
      }, 300); // 300ms debounce
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
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

    // Clear any pending search timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  };

  /**
   * Handle going back to dashboard
   */
  const handleBack = () => {
    resetSearchState();
    onBack?.();
  };

  /**
   * Handle form submission - just trigger search, don't auto-select
   */
  const handleSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const searchTerm = formData.get("symbol") as string;

    if (searchTerm && searchTerm.trim().length >= 2) {
      // Just search with the exact input, don't auto-modify or select
      searchSymbols(searchTerm.trim());
    }
  };

  /**
   * Handle clicking outside search results to close dropdown
   */
  const handleDocumentClick = (e: MouseEvent) => {
    const searchContainer = document.querySelector(".search-container");
    if (searchContainer && !searchContainer.contains(e.target as Node)) {
      setShowSearchResults(false);
    }
  };

  // Add event listener for clicking outside
  useEffect(() => {
    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
      // Cleanup timeout on unmount
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

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

          <p className="text-sm text-gray-600 mb-4">
            Search by company name, stock symbol, or WKN (e.g., "Apple", "AAPL",
            "865985")
          </p>

          {/* Search Form */}
          <form
            onSubmit={handleSymbolSubmit}
            className="flex gap-2 max-w-md relative search-container"
          >
            <div className="flex-1 relative">
              <input
                type="text"
                name="symbol"
                placeholder="Search: Tesla, TSLA, Netflix, NFLX..."
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
                    <div className="p-3 text-gray-500 flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.slice(0, 10).map(
                      (
                        result // Limit to 10 results
                      ) => (
                        <div
                          key={`${result.symbol}-${result.region}`}
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
                            {result.type && ` • ${result.type}`}
                          </div>
                        </div>
                      )
                    )
                  ) : searchQuery.trim().length >= 2 ? (
                    <div className="p-3 text-gray-500">
                      No results found for "{searchQuery}"
                      <div className="text-xs mt-1">
                        Try searching by company name or stock symbol
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 text-gray-500">
                      Type at least 2 characters to search
                    </div>
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
