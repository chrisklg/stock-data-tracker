import { useState, useCallback } from "react";
import { ProcessedStockResponse } from "./types/processedStockResponse";
import { SearchResult } from "./types/searchResult";
import { FavoriteStock } from "./types/favorites";

/**
 * Fetch stock data from API with caching support
 * @param stockSymbol company's short symbol
 * @param days number of days of data to fetch (default: 360)
 * @param useCache whether to use cached data (default: true)
 * @returns Promise<ProcessedStockResponse> or throws error
 */
export const fetchStockData = async (
  stockSymbol: string,
  days: number = 360,
  useCache: boolean = true
): Promise<ProcessedStockResponse> => {
  try {
    // Clean and validate the symbol
    const cleanSymbol = stockSymbol.trim().toUpperCase();
    if (!cleanSymbol) {
      throw new Error("Stock symbol is required");
    }

    const url = new URL("/api/stocks", window.location.origin);
    url.searchParams.set("symbol", cleanSymbol);
    url.searchParams.set("days", days.toString());
    url.searchParams.set("use_cache", useCache.toString());

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30000), // 30 seconds
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 404) {
        throw new Error(
          `No data points found for ${cleanSymbol}. Please verify the symbol is correct.`
        );
      }

      throw new Error(
        errorData.error || `Failed to fetch data (${response.status})`
      );
    }

    const data: ProcessedStockResponse = await response.json();

    if (!data.metadata || !data.data || !Array.isArray(data.data)) {
      throw new Error("Invalid response format from API");
    }

    if (data.data.length === 0) {
      throw new Error(`No data available for ${cleanSymbol}`);
    }

    return data;
  } catch (err) {
    console.error("Stock data fetch error:", err);

    if (err instanceof Error) {
      if (err.name === "TimeoutError") {
        throw new Error("Request timeout - please try again");
      }
      if (err.message.includes("fetch") && !err.message.includes("No data")) {
        throw new Error("Network error - please check your connection");
      }
    }

    throw err;
  }
};

/**
 * Search for stock symbols with enhanced support for company names and WKN
 * @param keywords search terms (symbol, company name, or WKN)
 * @returns Promise<SearchResult[]> or throws error
 */
export const searchStocks = async (
  keywords: string
): Promise<SearchResult[]> => {
  try {
    if (!keywords.trim()) {
      return [];
    }

    const cleanKeywords = keywords.trim();

    // Don't search for very short queries to avoid too many results
    if (cleanKeywords.length < 2) {
      return [];
    }

    const url = new URL("/api/search", window.location.origin);
    url.searchParams.set("keywords", cleanKeywords);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30000), // Increased to 30 seconds to match search
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 404) {
        return []; // No results found, return empty array
      }

      throw new Error(errorData.error || `Search failed (${response.status})`);
    }

    const results: SearchResult[] = await response.json();
    return Array.isArray(results) ? results : [];
  } catch (err) {
    console.error("Stock search error:", err);

    if (err instanceof Error) {
      if (err.name === "TimeoutError") {
        throw new Error(
          "Search timeout - please try again with a shorter query"
        );
      }
      if (err.message.includes("fetch")) {
        throw new Error("Network error - please check your connection");
      }
    }

    throw err;
  }
};

/**
 * Fetch favorites from database
 * @returns Promise<FavoriteStock[]> or throws error
 */
export const fetchFavorites = async (): Promise<FavoriteStock[]> => {
  try {
    const response = await fetch("/api/favorites", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to fetch favorites (${response.status})`
      );
    }

    const favorites: FavoriteStock[] = await response.json();
    return Array.isArray(favorites) ? favorites : [];
  } catch (err) {
    console.error("Fetch favorites error:", err);
    throw err;
  }
};

/**
 * Add stock to favorites
 * @param stock stock to add to favorites
 * @returns Promise<FavoriteStock> or throws error
 */
export const addFavorite = async (
  stock: Omit<FavoriteStock, "addedAt">
): Promise<FavoriteStock> => {
  try {
    console.log("Adding favorite:", stock);
    const response = await fetch("/api/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symbol: stock.symbol.trim().toUpperCase(),
        name: stock.name,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to add favorite (${response.status})`
      );
    }

    const favorite: FavoriteStock = await response.json();
    return favorite;
  } catch (err) {
    console.error("Add favorite error:", err);
    throw err;
  }
};

/**
 * Remove stock from favorites
 * @param symbol stock symbol to remove
 * @returns Promise<void> or throws error
 */
export const removeFavorite = async (symbol: string): Promise<void> => {
  try {
    const cleanSymbol = symbol.trim().toUpperCase();
    const response = await fetch(
      `/api/favorites/${encodeURIComponent(cleanSymbol)}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 404) {
        // If it's not found, consider it already removed
        console.warn(
          `Stock ${cleanSymbol} not found in favorites, considering it removed`
        );
        return;
      }

      throw new Error(
        errorData.error || `Failed to remove favorite (${response.status})`
      );
    }
  } catch (err) {
    console.error("Remove favorite error:", err);
    throw err;
  }
};

/**
 * Check if stock is in favorites
 * @param symbol stock symbol to check
 * @returns Promise<boolean> or throws error
 */
export const checkFavorite = async (symbol: string): Promise<boolean> => {
  try {
    const cleanSymbol = symbol.trim().toUpperCase();
    const response = await fetch(
      `/api/favorites/${encodeURIComponent(cleanSymbol)}/check`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 404) {
        return false; // Not found means not a favorite
      }

      throw new Error(
        errorData.error || `Failed to check favorite (${response.status})`
      );
    }

    const result = await response.json();
    return result.isFavorite === true;
  } catch (err) {
    console.error("Check favorite error:", err);
    // Return false on error to avoid blocking UI
    return false;
  }
};

/**
 * Get API statistics
 * @returns Promise with database and scheduler stats
 */
export const getApiStats = async () => {
  try {
    const response = await fetch("/api/stats", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to get stats (${response.status})`
      );
    }

    return await response.json();
  } catch (err) {
    console.error("Get stats error:", err);
    throw err;
  }
};

/**
 * Custom hook for fetching stock data with state management
 */
export const useStockData = () => {
  const [stockData, setStockData] = useState<ProcessedStockResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStock = useCallback(
    async (
      stockSymbol: string,
      days: number = 360,
      useCache: boolean = true
    ) => {
      if (!stockSymbol?.trim()) {
        setError("Stock symbol is required");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await fetchStockData(
          stockSymbol.trim().toUpperCase(),
          days,
          useCache
        );
        setStockData(data);
        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        setStockData(null);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const refreshStock = useCallback(
    async (stockSymbol: string, days: number = 360) => {
      return fetchStock(stockSymbol, days, false);
    },
    [fetchStock]
  );

  const clearData = useCallback(() => {
    setStockData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    stockData,
    loading,
    error,
    fetchStock,
    refreshStock,
    clearData,
  };
};

/**
 * Custom hook for stock search with debouncing
 */
export const useStockSearch = (debounceMs: number = 300) => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchStocksDebounced = useCallback(
    async (keywords: string) => {
      if (!keywords.trim() || keywords.trim().length < 2) {
        setSearchResults([]);
        setSearchError(null);
        setSearchLoading(false);
        return;
      }

      setSearchLoading(true);
      setSearchError(null);

      try {
        // Add a small delay for debouncing
        await new Promise((resolve) => setTimeout(resolve, debounceMs));

        const results = await searchStocks(keywords);
        setSearchResults(results);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Search failed";
        setSearchError(errorMessage);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [debounceMs]
  );

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchError(null);
    setSearchLoading(false);
  }, []);

  return {
    searchResults,
    searchLoading,
    searchError,
    searchStocks: searchStocksDebounced,
    clearSearch,
  };
};

/**
 * Custom hook for favorites management (simplified without user management)
 */
export const useFavoritesManager = () => {
  const [favorites, setFavorites] = useState<FavoriteStock[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    setFavoritesLoading(true);
    setFavoritesError(null);

    try {
      const data = await fetchFavorites();
      setFavorites(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load favorites";
      setFavoritesError(errorMessage);

      // Fallback to localStorage for offline functionality
      try {
        const stored = localStorage?.getItem("favorites");
        if (stored) {
          const localFavorites = JSON.parse(stored);
          setFavorites(Array.isArray(localFavorites) ? localFavorites : []);
        }
      } catch (localErr) {
        console.error("Error reading localStorage fallback:", localErr);
      }
    } finally {
      setFavoritesLoading(false);
    }
  }, []);

  const addToFavorites = useCallback(
    async (stock: Omit<FavoriteStock, "addedAt">) => {
      const tempFavorite: FavoriteStock = {
        ...stock,
        symbol: stock.symbol.trim().toUpperCase(),
        addedAt: new Date().toISOString(),
      };

      // Optimistic update
      setFavorites((prev) => [
        tempFavorite,
        ...prev.filter(
          (f) => f.symbol.toLowerCase() !== stock.symbol.toLowerCase()
        ),
      ]);

      try {
        const newFavorite = await addFavorite(stock);
        // Update with server response
        setFavorites((prev) =>
          prev.map((f) =>
            f.symbol.toLowerCase() === stock.symbol.toLowerCase()
              ? newFavorite
              : f
          )
        );

        // Sync to localStorage for offline functionality
        try {
          const updatedFavorites = favorites.filter(
            (f) => f.symbol.toLowerCase() !== stock.symbol.toLowerCase()
          );
          updatedFavorites.unshift(newFavorite);
          localStorage?.setItem("favorites", JSON.stringify(updatedFavorites));
        } catch (localErr) {
          console.error("Error syncing to localStorage:", localErr);
        }

        return newFavorite;
      } catch (err) {
        // Revert optimistic update
        setFavorites((prev) =>
          prev.filter(
            (f) => f.symbol.toLowerCase() !== stock.symbol.toLowerCase()
          )
        );
        throw err;
      }
    },
    [favorites]
  );

  const removeFromFavorites = useCallback(
    async (symbol: string) => {
      const cleanSymbol = symbol.trim().toUpperCase();
      const previousFavorites = favorites;

      // Optimistic update
      setFavorites((prev) =>
        prev.filter((f) => f.symbol.toLowerCase() !== cleanSymbol.toLowerCase())
      );

      try {
        await removeFavorite(cleanSymbol);

        // Sync to localStorage for offline functionality
        try {
          const updatedFavorites = favorites.filter(
            (f) => f.symbol.toLowerCase() !== cleanSymbol.toLowerCase()
          );
          localStorage?.setItem("favorites", JSON.stringify(updatedFavorites));
        } catch (localErr) {
          console.error("Error syncing to localStorage:", localErr);
        }
      } catch (err) {
        // Revert optimistic update
        setFavorites(previousFavorites);

        // Check if it was a 404 error (stock not found) - in that case, keep the optimistic update
        if (err instanceof Error && err.message.includes("not found")) {
          console.warn(
            "Stock was not found in favorites, keeping local removal"
          );
          return; // Don't revert the local change
        }

        throw err;
      }
    },
    [favorites]
  );

  const isFavorite = useCallback(
    (symbol: string): boolean => {
      const cleanSymbol = symbol.trim().toUpperCase();
      return favorites.some(
        (f) => f.symbol.toLowerCase() === cleanSymbol.toLowerCase()
      );
    },
    [favorites]
  );

  return {
    favorites,
    favoritesLoading,
    favoritesError,
    loadFavorites,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
  };
};

/**
 * Utility function to format currency values
 */
export const formatCurrency = (
  value: number,
  currency: string = "USD"
): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Utility function to format percentage changes
 */
export const formatPercentage = (value: number): string => {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);

  return value >= 0 ? `+${formatted}` : formatted;
};

/**
 * Utility function to calculate price change and percentage
 */
export const calculatePriceChange = (
  currentPrice: number,
  previousPrice: number
) => {
  const change = currentPrice - previousPrice;
  const changePercent = (change / previousPrice) * 100;

  return {
    change,
    changePercent,
    isPositive: change >= 0,
    formattedChange: formatCurrency(Math.abs(change)),
    formattedChangePercent: formatPercentage(changePercent),
  };
};

/**
 * Utility function to validate stock symbol format
 */
export const isValidStockSymbol = (symbol: string): boolean => {
  if (!symbol || typeof symbol !== "string") return false;

  const cleanSymbol = symbol.trim().toUpperCase();

  // Basic validation: 1-10 characters, letters and numbers only
  const symbolRegex = /^[A-Z0-9]{1,10}$/;
  return symbolRegex.test(cleanSymbol);
};

/**
 * Utility function to sanitize search input
 */
export const sanitizeSearchInput = (input: string): string => {
  if (!input || typeof input !== "string") return "";

  // Remove special characters but keep spaces, letters, numbers, and common symbols
  return input.trim().replace(/[<>\"'&]/g, "");
};
