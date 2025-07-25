import { AlphaVantageConfig } from "./types/alphaVantageConfig";
import {
  AlphaVantageResponse,
  ProcessedStockResponse,
} from "./types/alphaVantageResponse";
import { DailyStockData } from "./types/stockData";
import { StockMetadata } from "./types/stockMetadata";

class AlphaVantageAPI {
  private config: AlphaVantageConfig;

  constructor() {
    this.config = {
      apiKey: process.env.ALPHA_VANTAGE_API_KEY || "",
      baseUrl: process.env.BASE_URL || "https://www.alphavantage.co/query",
    };
    if (!this.config.apiKey) {
      throw new Error("ALPHA_VANTAGE_API_KEY environment variable is required");
    }
  }
  /**
   * Fetch daily stock data for a given symbol
   * @param symbol company short symbol
   * @param outputSize default type 'compact' or type 'full'
   * @returns an ProcessedStockResponse[] object
   */
  async getDailyStockData(
    symbol: string,
    outputSize: "compact" | "full" = "compact"
  ): Promise<ProcessedStockResponse> {
    const url = this.buildUrl({
      function: "TIME_SERIES_DAILY",
      symbol: symbol.toUpperCase(),
      outputsize: outputSize,
      apikey: this.config.apiKey,
    });

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000), // 10 seconds
      });

      if (!response.ok) {
        throw new Error(`HTTP error - status: ${response.status}`);
      }

      const data: AlphaVantageResponse = await response.json();

      // Check API errors
      if ("Error Message" in data) {
        throw new Error(
          `Alpha Vantage API Error: ${(data as any)["Error Message"]}`
        );
      }

      if ("Note" in data) {
        throw new Error(`Alpha Vantage Rate Limit: ${(data as any)["Note"]}`);
      }

      if (!data["Meta Data"] || !data["Time Series (Daily)"]) {
        throw new Error("Invalid response format from Alpha Vantage API");
      }

      return this.processStockData(data);
    } catch (error) {
      console.error(`Error fetching stock data for ${symbol}:`, error);
      throw new Error(
        `Failed to fetch stock data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Build URL with query parameters
   * @param params Record of function, and symbol maybe output size and apiKey
   * @returns created url for request specific stock
   */
  private buildUrl(params: Record<string, string>): string {
    const url = new URL(this.config.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    return url.toString();
  }

  /**
   *  Search for stock symbols
   * @param keywords
   * @returns
   */
  async searchSymbols(keywords: string): Promise<
    Array<{
      symbol: string;
      name: string;
      type: string;
      region: string;
      currency: string;
    }>
  > {
    const url = this.buildUrl({
      function: "SYMBOL_SEARCH",
      keywords: keywords,
      apikey: this.config.apiKey,
    });

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP error - status: ${response.status}`);
      }

      const data = await response.json();

      if ("Error Message" in data) {
        throw new Error(`Alpha Vantage API Error: ${data["Error Message"]}`);
      }

      const matches = data["bestMatches"] || [];

      return matches.map((match: any) => ({
        symbol: match["1. symbol"],
        name: match["2. name"],
        type: match["3. type"],
        region: match["4. region"],
        currency: match["8. currency"],
      }));
    } catch (error) {
      console.error(`Error searching symbols for ${keywords}:`, error);
      throw error;
    }
  }

  /**
   * Process raw Alpha Vantage response into clean format
   * @param data
   * @returns
   */
  private processStockData(data: AlphaVantageResponse): ProcessedStockResponse {
    const metadata: StockMetadata = {
      symbol: data["Meta Data"]["2. Symbol"],
      lastRefreshed: data["Meta Data"]["3. Last Refreshed"],
      timeZone: data["Meta Data"]["5. Time Zone"],
    };

    const dailyData: DailyStockData[] = Object.entries(
      data["Time Series (Daily)"]
    )
      .map(([date, values]) => ({
        date,
        open: parseFloat(values["1. open"]),
        high: parseFloat(values["2. high"]),
        low: parseFloat(values["3. low"]),
        close: parseFloat(values["4. close"]),
        volume: parseInt(values["5. volume"]),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      metadata,
      data: dailyData,
    };
  }
}
export const alphaVantageAPI = new AlphaVantageAPI();
