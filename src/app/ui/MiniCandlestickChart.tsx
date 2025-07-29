import { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  ColorType,
  Time,
  CandlestickSeries,
} from "lightweight-charts";
import { DailyStockData } from "@/lib/types/stockData";
import FavoriteButton from "./FavoriteButton";
import { useStockData } from "@/lib/util";

const DAYS = 360;

interface MiniCandlestickChartProps {
  symbol: string;
  height?: number;
}

export default function MiniCandlestickChart({
  symbol,
  height = 300,
}: MiniCandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const { stockData, loading, error, fetchStock, clearData } = useStockData();

  // Fetch stock data when symbol changes
  useEffect(() => {
    const handleFetchStock = async () => {
      if (!symbol) return;

      try {
        // Fetch data
        await fetchStock(symbol, DAYS);
      } catch (error) {
        // Error is handled by the hook
        console.error(`Error fetching data for ${symbol}:`, error);
      }
    };

    handleFetchStock();

    // Cleanup when symbol changes
    return () => {
      clearData();
    };
  }, [symbol, fetchStock, clearData]);

  const convertToChartData = (
    data: DailyStockData[]
  ): CandlestickData<Time>[] => {
    const sortedData = [...data].sort((a, b) => a.time - b.time);
    return sortedData.map((item) => ({
      time: item.time as Time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));
  };

  // Initialize chart with dark mode support
  useEffect(() => {
    const initializeChart = () => {
      if (!chartContainerRef.current) {
        setTimeout(initializeChart, 50);
        return;
      }

      // Clear previous chart
      if (chartRef.current) {
        chartRef.current.remove();
      }

      // Check if dark mode is active
      const isDarkMode = document.documentElement.classList.contains("dark");

      const chartOptions = {
        layout: {
          textColor: isDarkMode ? "#e2e8f0" : "#64748b",
          background: {
            type: ColorType.Solid,
            color: isDarkMode ? "#1e293b" : "#f8fafc",
          },
        },
        width: chartContainerRef.current.clientWidth || 300,
        height: height - 100, // Leave space for header
        grid: {
          vertLines: { color: isDarkMode ? "#374151" : "#e2e8f0" },
          horzLines: { color: isDarkMode ? "#374151" : "#e2e8f0" },
        },
        rightPriceScale: {
          borderColor: isDarkMode ? "#4b5563" : "#cbd5e1",
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: isDarkMode ? "#4b5563" : "#cbd5e1",
          timeVisible: false, // Hide time
          secondsVisible: false,
        },
        crosshair: {
          mode: 0, // Normal crosshair
        },
      };

      try {
        const chart = createChart(chartContainerRef.current, chartOptions);
        chartRef.current = chart;

        // Set chart design with dark mode support
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
          upColor: "#10b981",
          downColor: "#ef4444",
          borderVisible: false,
          wickUpColor: "#10b981",
          wickDownColor: "#ef4444",
        });

        candlestickSeriesRef.current = candlestickSeries;

        chart.priceScale("right").applyOptions({
          borderVisible: false,
        });

        chart.timeScale().applyOptions({
          borderVisible: false,
        });
      } catch (error) {
        console.error(`Error creating chart for ${symbol}:`, error);
      }
    };

    setTimeout(initializeChart, 100);

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [height, symbol]);

  // Update chart data
  useEffect(() => {
    const updateChart = () => {
      if (!candlestickSeriesRef.current || !stockData?.data?.length) {
        return;
      }

      try {
        const chartData = convertToChartData(stockData.data);
        candlestickSeriesRef.current.setData(chartData);

        setTimeout(() => {
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
          }
        }, 100);
      } catch (error) {
        console.error(`Error updating chart data for ${symbol}:`, error);
      }
    };

    updateChart();
  }, [stockData, symbol]);

  // Handle retry functionality
  const handleRetry = async () => {
    try {
      await fetchStock(symbol, DAYS);
    } catch (error) {
      console.error(`Error retrying fetch for ${symbol}:`, error);
    }
  };

  if (loading) {
    return (
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
        style={{ height: `${height}px` }}
      >
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-16 animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20 mt-1 animate-pulse"></div>
            </div>
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div
          className="flex items-center justify-center"
          style={{ height: `${height - 80}px` }}
        >
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 dark:border-blue-400"></div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              Loading chart for {symbol}...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stockData) {
    return (
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
        style={{ height: `${height}px` }}
      >
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">
                {symbol}
              </h3>
              <p className="text-sm text-red-500 dark:text-red-400">
                Error loading data
              </p>
            </div>
            <FavoriteButton stock={{ symbol, name: symbol }} size={20} />
          </div>
        </div>
        <div
          className="flex items-center justify-center"
          style={{ height: `${height - 80}px` }}
        >
          <div className="text-center">
            <div className="text-red-500 dark:text-red-400 text-sm mb-2">
              {error || "Failed to load chart data"}
            </div>
            <button
              onClick={handleRetry}
              className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm underline transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate price changes
  const latestData = stockData.data[0];
  const previousData = stockData.data[1];
  const priceChange = previousData ? latestData.close - previousData.close : 0;
  const priceChangePercent = previousData
    ? (priceChange / previousData.close) * 100
    : 0;

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-2xl transition-shadow"
      style={{ height: `${height}px` }}
    >
      {/* Mini Chart Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
              {symbol}
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Last: {stockData.metadata.lastRefreshed}
            </div>
          </div>
          <FavoriteButton
            stock={{
              symbol,
              name: symbol,
              lastPrice: latestData.close,
            }}
            size={20}
          />
        </div>

        {/* Price Info */}
        <div className="mt-2">
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            ${latestData.close.toFixed(2)}
          </div>
          <div
            className={`text-sm font-medium ${
              priceChange >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {priceChange >= 0 ? "+" : ""}
            {priceChange.toFixed(2)} ({priceChangePercent >= 0 ? "+" : ""}
            {priceChangePercent.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative">
        <div
          ref={chartContainerRef}
          className="w-full"
          style={{ height: `${height - 120}px` }}
        />
      </div>
    </div>
  );
}
