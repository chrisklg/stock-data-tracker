import { DailyStockData } from "./stockData";
import { StockMetadata } from "./stockMetadata";

export interface AlphaVantageResponse {
  "Meta Data": {
    "1. Information": string;
    "2. Symbol": string;
    "3. Last Refreshed": string;
    "4. Output Size": string;
    "5. Time Zone": string;
  };
  "Time Series (Daily)": {
    [date: string]: {
      "1. open": string;
      "2. high": string;
      "3. low": string;
      "4. close": string;
      "5. volume": string;
    };
  };
}


export interface ProcessedStockResponse {
  metadata: StockMetadata;
  data: DailyStockData[];
}