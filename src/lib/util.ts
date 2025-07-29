import { useState, useCallback } from "react";
import { ProcessedStockResponse } from "./types/alphaVantageResponse";

/**
 * Fetch stock data from API
 * @param stockSymbol company's short symbol
 * @param days number of days of data to fetch (default: 360)
 * @returns Promise<ProcessedStockResponse> or throws error
 */
export const fetchStockData = async (
  stockSymbol: string,
  days: number = 360
): Promise<ProcessedStockResponse> => {
  try {
    const response = await fetch(
      `/api/stocks?symbol=${stockSymbol}&days=${days}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch data");
    }

    const data: ProcessedStockResponse = await response.json();
    return data;
  } catch (err) {
    console.error("Frontend Error:", err);
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
    async (stockSymbol: string, days: number = 360) => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchStockData(stockSymbol, days);
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
    clearData,
  };
};
