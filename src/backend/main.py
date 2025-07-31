from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
import logging
from typing import List, Optional, cast
from datetime import datetime, timedelta, date
from pydantic import BaseModel

from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame
from alpaca.data.enums import Adjustment
from alpaca.trading import TradingClient

from database import db_manager, FavoriteModel, StockPriceModel

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start
    try:
        await db_manager.initialize()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise

    yield

    # Shutdown
    await db_manager.close()


app = FastAPI(title="Stock Data API", version="2.0.0", lifespan=lifespan)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models for API responses
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


class FavoriteResponse(BaseModel):
    symbol: str
    name: Optional[str] = None
    addedAt: str
    lastPrice: Optional[float] = None


class FavoriteRequest(BaseModel):
    symbol: str
    name: Optional[str] = None


# Database dependency
async def get_db():
    if not db_manager.pool:
        await db_manager.initialize()
    return db_manager


class AlpacaDataClient:
    """Client for interacting with Alpaca APIs"""

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
            logger.info("Alpaca clients initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing Alpaca clients: {e}")
            raise

    async def get_daily_stock_data(
        self, symbol: str, days: int = 100, use_cache: bool = True
    ) -> ProcessedStockResponse:
        """Fetch daily stock data for a given symbol, with database caching"""
        db = await get_db()

        # Try to get data from database first if use_cache is True
        if use_cache:
            try:
                cached_data = await db.get_stock_prices(symbol, days)
                if cached_data:
                    logger.info(
                        f"Using cached data for {symbol}: {len(cached_data)} records"
                    )

                    # Convert to response format
                    daily_data = []
                    for price in cached_data:
                        timestamp = int(
                            datetime.combine(
                                price.date, datetime.min.time()
                            ).timestamp()
                        )
                        daily_data.append(
                            DailyStockData(
                                date=price.date.strftime("%Y-%m-%d"),
                                open=float(price.open_price or 0),
                                high=float(price.high_price or 0),
                                low=float(price.low_price or 0),
                                close=float(price.close_price or 0),
                                volume=int(price.volume or 0),
                                time=timestamp,
                            )
                        )

                    if daily_data:
                        metadata = StockMetadata(
                            symbol=symbol.upper(),
                            lastRefreshed=daily_data[0].date,
                            timeZone="US/Eastern",
                        )
                        return ProcessedStockResponse(
                            metadata=metadata, data=daily_data
                        )
            except Exception as e:
                logger.warning(f"Error retrieving cached data for {symbol}: {e}")

        # Fetch from Alpaca API
        try:
            end_date = datetime.now() - timedelta(days=1)  # Yesterday
            start_date = end_date - timedelta(days=days)

            logger.info(f"Fetching fresh data for {symbol} from Alpaca API")

            request_params = StockBarsRequest(
                symbol_or_symbols=symbol.upper(),
                timeframe=cast(TimeFrame, TimeFrame.Day),
                start=start_date,
                end=end_date,
                limit=days + 10,  # Buffer for weekends
                adjustment=Adjustment.RAW,
            )
            bars = self.historical_client.get_stock_bars(request_params)

            # Extract symbol data
            symbol_data = None
            if hasattr(bars, "data"):
                bars_data = bars.data  # type: ignore
                if symbol.upper() in bars_data:
                    symbol_data = bars_data[symbol.upper()]
            elif hasattr(bars, "__iter__"):
                try:
                    for symbol_key in bars:
                        if symbol_key.upper() == symbol.upper():  # type: ignore
                            symbol_data = bars[symbol_key]  # type: ignore
                            break
                except Exception:
                    pass

            if symbol_data is None:
                raise HTTPException(
                    status_code=404, detail=f"No data found for symbol {symbol}"
                )

            # Process and cache the data
            daily_data = []
            price_data_for_db = []

            for bar in symbol_data:
                timestamp = int(bar.timestamp.timestamp())
                date_str = bar.timestamp.strftime("%Y-%m-%d")

                daily_data.append(
                    DailyStockData(
                        date=date_str,
                        open=float(bar.open),
                        high=float(bar.high),
                        low=float(bar.low),
                        close=float(bar.close),
                        volume=int(bar.volume),
                        time=timestamp,
                    )
                )

                # Prepare data for database storage
                price_data_for_db.append(
                    {
                        "date": bar.timestamp.date(),
                        "open": float(bar.open),
                        "high": float(bar.high),
                        "low": float(bar.low),
                        "close": float(bar.close),
                        "volume": int(bar.volume),
                    }
                )

            # Sort by date (newest first)
            daily_data.sort(key=lambda x: x.date, reverse=True)

            if not daily_data:
                raise HTTPException(
                    status_code=404, detail=f"No data points found for {symbol}"
                )

            # Cache data in database
            try:
                saved_count = await db.save_stock_prices(symbol, price_data_for_db)
                logger.info(f"Cached {saved_count} price records for {symbol}")
            except Exception as e:
                logger.error(f"Error caching data for {symbol}: {e}")

            # Create metadata
            metadata = StockMetadata(
                symbol=symbol.upper(),
                lastRefreshed=daily_data[0].date,
                timeZone="US/Eastern",
            )

            return ProcessedStockResponse(metadata=metadata, data=daily_data)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching data for {symbol}: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to fetch data for {symbol}"
            )

    def search_symbols(self, keywords: str) -> List[AssetInfo]:
        """Search for stock symbols by keywords"""
        try:
            logger.info(f"Searching for symbols with keywords: {keywords}")
            assets = self.trading_client.get_all_assets()

            keywords_lower = keywords.lower()
            matching_assets = []

            for asset in assets:
                try:
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

                        if len(matching_assets) >= 15:
                            break

                except Exception:
                    continue

            return matching_assets

        except Exception as e:
            logger.error(f"Error searching symbols for {keywords}: {str(e)}")
            return []


# Initialize clients
logger.info("=== Initializing Application ===")
try:
    alpaca_client = AlpacaDataClient()
    logger.info("Alpaca client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Alpaca client: {str(e)}")
    alpaca_client = None


# API Routes
@app.get("/")
async def root():
    return {
        "message": "Personal Stock Data API v2.0 with PostgreSQL",
        "status": "healthy",
        "features": ["database_caching", "favorites_management"],
        "note": "Single-user personal stock tracker",
    }


@app.get("/api/stocks", response_model=ProcessedStockResponse)
async def get_stock_data(
    symbol: str = Query(..., description="Stock symbol (like AAPL)"),
    days: int = Query(
        100, description="Number of days of historical data", ge=1, le=1000
    ),
    use_cache: bool = Query(True, description="Use cached data if available"),
):
    """Get daily stock data for a symbol with database caching"""
    if not alpaca_client:
        raise HTTPException(status_code=500, detail="Alpaca client not initialized")

    return await alpaca_client.get_daily_stock_data(symbol, days, use_cache)


@app.get("/api/search", response_model=List[AssetInfo])
async def search_stocks(
    keywords: str = Query(..., description="Search keywords for stock symbols")
):
    """Search for stock symbols"""
    if not alpaca_client:
        raise HTTPException(status_code=500, detail="Alpaca client not initialized")

    return alpaca_client.search_symbols(keywords)


@app.get("/api/favorites", response_model=List[FavoriteResponse])
async def get_favorites(db=Depends(get_db)):
    """Get all favorites from database"""
    try:
        favorites = await db.get_favorites()
        return [
            FavoriteResponse(
                symbol=fav.symbol,
                name=fav.name,
                addedAt=fav.added_at.isoformat(),
                lastPrice=fav.last_price,
            )
            for fav in favorites
        ]
    except Exception as e:
        logger.error(f"Error getting favorites: {e}")
        raise HTTPException(status_code=500, detail="Failed to get favorites")


@app.post("/api/favorites", response_model=FavoriteResponse)
async def add_favorite(favorite: FavoriteRequest, db=Depends(get_db)):
    """Add stock to favorites"""
    try:
        print(f"DEBUG: Adding favorite: {favorite.symbol}, {favorite.name}")  # Debug
        fav = await db.add_favorite(favorite.symbol, favorite.name)
        print(f"DEBUG: Successfully added: {fav}")  # Debug
        return FavoriteResponse(
            symbol=fav.symbol,
            name=fav.name,
            addedAt=fav.added_at.isoformat(),
            lastPrice=fav.last_price,
        )
    except Exception as e:
        print(f"DEBUG: Error adding favorite: {e}")  # Debug
        print(f"DEBUG: Error type: {type(e)}")  # Debug
        logger.error(f"Error adding favorite {favorite.symbol}: {e}")
        raise HTTPException(status_code=500, detail="Failed to add favorite")


@app.delete("/api/favorites/{symbol}")
async def remove_favorite(symbol: str, db=Depends(get_db)):
    """Remove stock from favorites"""
    try:
        success = await db.remove_favorite(symbol)
        if not success:
            raise HTTPException(status_code=404, detail="Favorite not found")
        return {"message": f"Removed {symbol} from favorites"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing favorite {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove favorite")


@app.get("/api/favorites/{symbol}/check")
async def check_favorite(symbol: str, db=Depends(get_db)):
    """Check if stock is in favorites"""
    try:
        is_fav = await db.is_favorite(symbol)
        return {"symbol": symbol, "isFavorite": is_fav}
    except Exception as e:
        logger.error(f"Error checking favorite {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Failed to check favorite status")


# Additional utility endpoints
@app.get("/api/stats")
async def get_stats(db=Depends(get_db)):
    """Get database statistics"""
    try:
        async with db.get_connection() as conn:
            # Get counts
            favorites_count = await conn.fetchval("SELECT COUNT(*) FROM favorites")
            stocks_count = await conn.fetchval("SELECT COUNT(*) FROM stocks")
            prices_count = await conn.fetchval("SELECT COUNT(*) FROM stock_prices")

            return {
                "favorites_count": favorites_count,
                "stocks_count": stocks_count,
                "prices_count": prices_count,
            }
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get statistics")


if __name__ == "__main__":
    import uvicorn

    logger.info("=== Starting Personal Stock Data API Server ===")
    uvicorn.run(app, host="0.0.0.0", port=8000)
