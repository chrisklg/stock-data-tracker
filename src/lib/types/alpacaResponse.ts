import { AlpacaBar } from "./alpacaBar";
import { DailyStockData } from "./stockData";
import { StockMetadata } from "./stockMetadata";

export interface ProcessedStockResponse {
  metadata: StockMetadata;
  data: DailyStockData[];
}

export interface AlpacaAssetResponse {
  id: string;
  class: string;
  exchange: string;
  symbol: string;
  name: string;
  status: string;
  tradable: boolean;
  marginable: boolean;
  shortable: boolean;
  easy_to_borrow: boolean;
  fractionable: boolean;
}

export interface AlpacaBarResponse {
  bars: {
    [symbol: string]: AlpacaBar[];
  };
  next_page_token?: string;
}
