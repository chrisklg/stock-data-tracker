import { DailyStockData } from "./stockData";
import { StockMetadata } from "./stockMetadata";

export interface ProcessedStockResponse {
  metadata: StockMetadata;
  data: DailyStockData[];
}
