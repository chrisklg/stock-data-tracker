from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
import logging
from typing import List, Optional, cast
from datetime import datetime, timedelta
from pydantic import BaseModel

from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame
from alpaca.data.enums import Adjustment
from alpaca.trading import TradingClient

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Stock Data API", version="1.0.0")

# ORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models for response formatting
class StockMetadata(BaseModel):
    symbol: str
    lastRefreshed: str
    timeZone: str


class DailyStockData(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    time: int


class ProcessedStockResponse(BaseModel):
    metadata: StockMetadata
    data: List[DailyStockData]


class AssetInfo(BaseModel):
    symbol: str
    name: str
    type: str
    region: str
    currency: str


class AlpacaDataClient:
    """Client for interacting with Alpaca APIs - Historical Data Only"""

    def __init__(self):
        self.api_key = os.environ.get("ALPACA_API_KEY")
        self.api_secret = os.environ.get("ALPACA_SECRET_KEY")

        if not self.api_key or not self.api_secret:
            raise ValueError(
                "ALPACA_API_KEY and ALPACA_API_SECRET environment variables are required"
            )

        try:
            # Initialize clients
            self.historical_client = StockHistoricalDataClient(
                self.api_key, self.api_secret
            )
            self.trading_client = TradingClient(
                self.api_key, self.api_secret, paper=True
            )
            print("Alpaca clients initialized successfully")
        except Exception as e:
            print(f"Error initializing Alpaca clients: {e}")
            raise

    def get_stock_bars(
        self,
        symbol: str,
        timeframe: TimeFrame = cast(TimeFrame, TimeFrame.Day),
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 1000,
        adjustment: Adjustment = Adjustment.RAW,
    ):
        """
        Fetch historical bar data for stocks

        Args:
            symbol: Stock symbol
            timeframe: Bar timeframe
            start: Start datetime
            end: End datetime
            limit: Maximum number of bars to return
            adjustment: Adjustment mode

        Returns:
            Dictionary of stock bars indexed by symbol
        """
        # Set default dates if not provided
        if not start:
            start = datetime.now() - timedelta(days=100)

        if not end:
            end = datetime.now() - timedelta(days=1)

        # Ensure we're not requesting data too recent
        if end > datetime.now() - timedelta(days=1):
            end = datetime.now() - timedelta(days=1)

        # Create request parameters
        request_params = StockBarsRequest(
            symbol_or_symbols=symbol,
            timeframe=timeframe,
            start=start,
            end=end,
            limit=limit,
            adjustment=adjustment,
        )

        try:
            # API request
            logger.info(
                f"Fetching historical bar data for {symbol} from {start.date()} to {end.date()}"
            )
            bars = self.historical_client.get_stock_bars(request_params)

            return bars

        except Exception as e:
            logger.error(f"Error fetching bar data: {str(e)}")
            raise

    def get_daily_stock_data(
        self, symbol: str, days: int = 100
    ) -> ProcessedStockResponse:
        """
        Fetch daily stock data for a given symbol

        Args:
            symbol: Stock symbol ('AAPL')
            days: Number of days of historical data to fetch

        Returns:
            ProcessedStockResponse with metadata and daily data
        """
        try:
            end_date = datetime.now() - timedelta(days=1)  # Yesterday
            start_date = end_date - timedelta(days=days)

            print(f"Fetching historical data for {symbol}")
            print(f"Date range: {start_date.date()} to {end_date.date()}")
            print(f"Requesting {days} days of historical data")

            request_params = StockBarsRequest(
                symbol_or_symbols=symbol.upper(),
                timeframe=cast(TimeFrame, TimeFrame.Day),
                start=start_date,
                end=end_date,
                limit=days + 10,  # Add buffer for weekends/holidays
                adjustment=Adjustment.RAW,
            )
            bars = self.historical_client.get_stock_bars(request_params)
            symbol_data = None

            if hasattr(bars, "data"):
                bars_data = bars.data  # type: ignore

                if symbol.upper() in bars_data:
                    symbol_data = bars_data[symbol.upper()]
                else:
                    print(f"Symbol {symbol.upper()} not found in BarSet.data")
                    print(f"Available symbols in BarSet: {list(bars_data.keys())}")

            elif hasattr(bars, "__iter__"):
                try:
                    for symbol_key in bars:
                        if symbol_key.upper() == symbol.upper():  # type: ignore
                            symbol_data = bars[symbol_key]  # type: ignore
                            print(f"Found data via iteration: {len(symbol_data)} bars")
                            break
                except Exception as iter_error:
                    print(f"Iteration failed: {iter_error}")

            elif hasattr(bars, symbol.upper()):
                symbol_data = getattr(bars, symbol.upper())
                print(f"Found data via attribute access: {len(symbol_data)} bars")

            else:
                try:
                    symbol_data = bars[symbol.upper()]
                except (KeyError, TypeError) as e:
                    print(f"Dictionary access failed: {e}")

            if symbol_data is None:
                # Get debug info about the BarSet structure
                debug_info = {
                    "type": str(type(bars)),
                    "attributes": [
                        attr for attr in dir(bars) if not attr.startswith("_")
                    ],
                    "has_data": hasattr(bars, "data"),
                    "has_df": hasattr(bars, "df"),
                }

                raise HTTPException(
                    status_code=404,
                    detail=f"Cannot access data for symbol {symbol}. BarSet structure: {debug_info}",
                )

            # Process the data
            symbol_bars = symbol_data

            if not symbol_bars:
                raise HTTPException(
                    status_code=404,
                    detail=f"No bars found for symbol {symbol} in the requested date range",
                )

            # Convert to our format
            daily_data = []
            for bar in symbol_bars:
                timestamp = int(bar.timestamp.timestamp())

                daily_data.append(
                    DailyStockData(
                        date=bar.timestamp.strftime("%Y-%m-%d"),
                        open=float(bar.open),
                        high=float(bar.high),
                        low=float(bar.low),
                        close=float(bar.close),
                        volume=int(bar.volume),
                        time=timestamp,
                    )
                )

            # Sort by date (newest first)
            daily_data.sort(key=lambda x: x.date, reverse=True)

            if not daily_data:
                raise HTTPException(
                    status_code=404,
                    detail=f"No data points found for {symbol} in the specified date range",
                )

            # Create metadata
            metadata = StockMetadata(
                symbol=symbol.upper(),
                lastRefreshed=daily_data[0].date,
                timeZone="US/Eastern",
            )

            return ProcessedStockResponse(metadata=metadata, data=daily_data)

        except HTTPException:
            raise


    def search_symbols(self, keywords: str) -> List[AssetInfo]:
        """
        Search for stock symbols by keywords
        """
        try:
            print(f"Searching for symbols with keywords: {keywords}")

            # Get all active assets
            assets = self.trading_client.get_all_assets()
            print(f"Retrieved {len(assets)} total assets from Alpaca")

            # Filter assets based on keywords
            keywords_lower = keywords.lower()
            matching_assets = []

            for asset in assets:
                try:
                    # Access asset properties safely
                    asset_status = getattr(asset, "status", None)
                    asset_class = getattr(asset, "asset_class", None)
                    asset_symbol = getattr(asset, "symbol", "")
                    asset_name = getattr(asset, "name", "")

                    if (
                        asset_status == "active"
                        and asset_class == "us_equity"
                        and (
                            keywords_lower in asset_symbol.lower()
                            or (asset_name and keywords_lower in asset_name.lower())
                        )
                    ):

                        matching_assets.append(
                            AssetInfo(
                                symbol=asset_symbol,
                                name=asset_name or asset_symbol,
                                type="Equity",
                                region="US",
                                currency="USD",
                            )
                        )

                        # Limit results to prevent overwhelming response
                        if len(matching_assets) >= 15:
                            break

                except Exception as asset_error:
                    # Skip problematic assets but continue processing
                    continue

            print(f"Found {len(matching_assets)} matching assets")
            return matching_assets

        except Exception as e:
            logger.error(f"Error searching symbols for {keywords}: {str(e)}")
            # Return empty list instead of error to allow fallback behavior
            return []


# Initialize the client
print("=== Initializing Alpaca Client ===")
try:
    alpaca_client = AlpacaDataClient()
    logger.info("Alpaca client initialized successfully")
    print("=== Alpaca Client Ready (Historical Data Only) ===\n")
except Exception as e:
    logger.error(f"Failed to initialize Alpaca client: {str(e)}")
    print(f"=== Alpaca Client Initialization Failed: {str(e)} ===\n")
    alpaca_client = None


# API Routes
@app.get("/")
async def root():
    return {
        "message": "Stock Data API is running",
        "status": "healthy",
        "note": "Historical data only - no real-time data",
        "data_range": "Up to 1 day ago",
    }


@app.get("/api/stocks", response_model=ProcessedStockResponse)
async def get_stock_data(
    symbol: str = Query(..., description="Stock symbol (e.g., AAPL)"),
    days: int = Query(
        360, description="Number of days of historical data", ge=1, le=1000
    ),
):
    """Get daily stock data for a symbol - Historical data only"""
    if not alpaca_client:
        raise HTTPException(status_code=500, detail="Alpaca client not initialized")

    return alpaca_client.get_daily_stock_data(symbol, days)


@app.get("/api/search", response_model=List[AssetInfo])
async def search_stocks(
    keywords: str = Query(..., description="Search keywords for stock symbols")
):
    """Search for stock symbols"""
    if not alpaca_client:
        raise HTTPException(status_code=500, detail="Alpaca client not initialized")

    return alpaca_client.search_symbols(keywords)

if __name__ == "__main__":
    import uvicorn

    print("=== Starting FastAPI Server ===")
    uvicorn.run(app, host="0.0.0.0", port=8000)
