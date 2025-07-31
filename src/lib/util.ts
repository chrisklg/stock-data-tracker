import { useState, useCallback } from "react";
import { ProcessedStockResponse } from "./types/processedStockResponse";

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
}

export interface FavoriteStock {
  symbol: string;
  name?: string;
  addedAt: string;
  lastPrice?: number;
}

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
    const url = new URL("/api/stocks", window.location.origin);
    url.searchParams.set("symbol", stockSymbol);
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
      throw new Error(
        errorData.error || `Failed to fetch data (${response.status})`
      );
    }

    const data: ProcessedStockResponse = await response.json();

    if (!data.metadata || !data.data || !Array.isArray(data.data)) {
      throw new Error("Invalid response format from API");
    }

    return data;
  } catch (err) {
    console.error("Stock data fetch error:", err);

    if (err instanceof Error) {
      if (err.name === "TimeoutError") {
        throw new Error("Request timeout - please try again");
      }
      if (err.message.includes("fetch")) {
        throw new Error("Network error - please check your connection");
      }
    }

    throw err;
  }
};

/**
 * Search for stock symbols
 * @param keywords search terms
 * @returns Promise<SearchResult[]> or throws error
 */
export const searchStocks = async (
  keywords: string
): Promise<SearchResult[]> => {
  try {
    if (!keywords.trim()) {
      return [];
    }

    const url = new URL("/api/search", window.location.origin);
    url.searchParams.set("keywords", keywords.trim());

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000), // 10 seconds
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Search failed (${response.status})`);
    }

    const results: SearchResult[] = await response.json();
    return Array.isArray(results) ? results : [];
  } catch (err) {
    console.error("Stock search error:", err);

    if (err instanceof Error) {
      if (err.name === "TimeoutError") {
        throw new Error("Search timeout - please try again");
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
        symbol: stock.symbol,
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
    const response = await fetch(
      `/api/favorites/${encodeURIComponent(symbol)}`,
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
    const response = await fetch(
      `/api/favorites/${encodeURIComponent(symbol)}/check`,
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
      throw new Error(
        errorData.error || `Failed to check favorite (${response.status})`
      );
    }

    const result = await response.json();
    return result.isFavorite === true;
  } catch (err) {
    console.error("Check favorite error:", err);
    throw err;
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
      if (!keywords.trim()) {
        setSearchResults([]);
        setSearchError(null);
        return;
      }

      setSearchLoading(true);
      setSearchError(null);

      const timeoutId = setTimeout(async () => {
        try {
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
      }, debounceMs);

      return () => clearTimeout(timeoutId);
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

      // Fallback to localStorage
      try {
        const stored = localStorage.getItem("favorites");
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

        // Sync to localStorage
        const updatedFavorites = favorites.filter(
          (f) => f.symbol.toLowerCase() !== stock.symbol.toLowerCase()
        );
        updatedFavorites.unshift(newFavorite);
        localStorage.setItem("favorites", JSON.stringify(updatedFavorites));

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
      const previousFavorites = favorites;

      // Optimistic update
      setFavorites((prev) =>
        prev.filter((f) => f.symbol.toLowerCase() !== symbol.toLowerCase())
      );

      try {
        await removeFavorite(symbol);

        // Sync to localStorage
        const updatedFavorites = favorites.filter(
          (f) => f.symbol.toLowerCase() !== symbol.toLowerCase()
        );
        localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
      } catch (err) {
        // Revert optimistic update
        setFavorites(previousFavorites);
        throw err;
      }
    },
    [favorites]
  );

  const isFavorite = useCallback(
    (symbol: string): boolean => {
      return favorites.some(
        (f) => f.symbol.toLowerCase() === symbol.toLowerCase()
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
