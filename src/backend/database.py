import os
import asyncpg
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel
import logging
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)


# Pydantic models for type safety
class StockModel(BaseModel):
    id: Optional[str] = None
    symbol: str
    name: Optional[str] = None
    exchange: Optional[str] = None
    currency: str = "USD"
    region: str = "US"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class FavoriteModel(BaseModel):
    id: Optional[str] = None
    stock_id: str
    symbol: str
    name: Optional[str] = None
    added_at: datetime
    last_price: Optional[float] = None


class StockPriceModel(BaseModel):
    id: Optional[str] = None
    stock_id: str
    symbol: str
    date: date
    open_price: Optional[float] = None
    high_price: Optional[float] = None
    low_price: Optional[float] = None
    close_price: Optional[float] = None
    volume: Optional[int] = None
    created_at: Optional[datetime] = None


class DatabaseManager:
    def __init__(self):
        self.pool = None

    async def initialize(self):
        """Initialize database connection pool"""
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError("DATABASE_URL environment variable is required")

        try:
            self.pool = await asyncpg.create_pool(
                database_url, min_size=1, max_size=10, command_timeout=60
            )
            logger.info("Database connection pool initialized")
        except Exception as e:
            logger.error(f"Failed to initialize database pool: {e}")
            raise

    async def close(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()

    @asynccontextmanager
    async def get_connection(self):
        """Get database connection from pool"""
        if not self.pool:
            raise RuntimeError("Database pool not initialized")

        async with self.pool.acquire() as connection:
            yield connection

    # Stock operations
    async def get_or_create_stock(
        self, symbol: str, name: Optional[str] = None
    ) -> StockModel:
        """Get existing stock or create new one"""
        if not symbol or not symbol.strip():
            raise ValueError("Symbol is required and cannot be empty")

        symbol = symbol.upper().strip()

        async with self.get_connection() as conn:
            try:
                # Try to get existing stock
                logger.info(f"Looking for existing stock: {symbol}")
                row = await conn.fetchrow(
                    "SELECT * FROM stocks WHERE symbol = $1", symbol
                )

                if row:
                    logger.info(f"Found existing stock: {symbol}")
                    return StockModel(**dict(row))

                # Create new stock
                logger.info(f"Creating new stock: {symbol}")
                row = await conn.fetchrow(
                    """
                    INSERT INTO stocks (symbol, name)
                    VALUES ($1, $2)
                    RETURNING *
                """,
                    symbol,
                    name,  # Can be None
                )

                if not row:
                    raise Exception(f"Failed to create stock {symbol}")

                logger.info(f"Successfully created stock: {symbol}")
                return StockModel(**dict(row))

            except Exception as e:
                logger.error(f"Error in get_or_create_stock for {symbol}: {e}")
                raise

    # Favorites operations
    async def add_favorite(
        self, symbol: str, name: Optional[str] = None
    ) -> FavoriteModel:
        """Add stock to favorites"""
        try:
            logger.info(f"DEBUG: Adding favorite: {symbol}, {name}")

            # Ensure stock exists
            stock = await self.get_or_create_stock(symbol, name)
            logger.info(f"DEBUG: Stock ready: {stock.id}")

            async with self.get_connection() as conn:
                try:
                    logger.info(f"DEBUG: Inserting into favorites table")
                    row = await conn.fetchrow(
                        """
                        INSERT INTO favorites (stock_id)
                        VALUES ($1)
                        RETURNING *
                    """,
                        stock.id,
                    )

                    if not row:
                        raise Exception("Failed to insert favorite")

                    logger.info(f"DEBUG: Insert successful: {row}")

                    return FavoriteModel(
                        id=row["id"],
                        stock_id=row["stock_id"],
                        symbol=stock.symbol,
                        name=stock.name,
                        added_at=row["added_at"],
                    )

                except asyncpg.UniqueViolationError:
                    logger.info(f"DEBUG: Already exists, fetching existing")
                    # Already exists, return existing
                    row = await conn.fetchrow(
                        """
                        SELECT f.*, s.symbol, s.name 
                        FROM favorites f
                        JOIN stocks s ON f.stock_id = s.id
                        WHERE s.symbol = $1
                    """,
                        symbol.upper(),
                    )

                    if not row:
                        raise Exception(
                            f"Favorite exists but could not retrieve it for {symbol}"
                        )

                    return FavoriteModel(**dict(row))

        except Exception as e:
            logger.error(f"DEBUG: Exception in add_favorite: {e}")
            raise

    async def remove_favorite(self, symbol: str) -> bool:
        """Remove stock from favorites"""
        if not symbol or not symbol.strip():
            return False

        async with self.get_connection() as conn:
            try:
                result = await conn.execute(
                    """
                    DELETE FROM favorites 
                    WHERE stock_id = (
                        SELECT id FROM stocks WHERE symbol = $1
                    )
                """,
                    symbol.upper().strip(),
                )

                return result != "DELETE 0"
            except Exception as e:
                logger.error(f"Error removing favorite {symbol}: {e}")
                return False

    async def get_favorites(self) -> List[FavoriteModel]:
        """Get all favorites with latest prices"""
        async with self.get_connection() as conn:
            try:
                rows = await conn.fetch(
                    """
                    SELECT 
                        f.id,
                        f.stock_id,
                        f.added_at,
                        s.symbol,
                        s.name,
                        sp.close_price as last_price
                    FROM favorites f
                    JOIN stocks s ON f.stock_id = s.id
                    LEFT JOIN LATERAL (
                        SELECT close_price 
                        FROM stock_prices 
                        WHERE stock_id = s.id 
                        ORDER BY date DESC 
                        LIMIT 1
                    ) sp ON true
                    ORDER BY f.added_at DESC
                """
                )

                return [FavoriteModel(**dict(row)) for row in rows]
            except Exception as e:
                logger.error(f"Error getting favorites: {e}")
                return []

    async def is_favorite(self, symbol: str) -> bool:
        """Check if stock is in favorites"""
        if not symbol or not symbol.strip():
            return False

        async with self.get_connection() as conn:
            try:
                result = await conn.fetchval(
                    """
                    SELECT EXISTS(
                        SELECT 1 FROM favorites f
                        JOIN stocks s ON f.stock_id = s.id
                        WHERE s.symbol = $1
                    )
                """,
                    symbol.upper().strip(),
                )

                return bool(result)
            except Exception as e:
                logger.error(f"Error checking if {symbol} is favorite: {e}")
                return False

    # Stock price operations
    async def save_stock_prices(
        self, symbol: str, price_data: List[Dict[str, Any]]
    ) -> int:
        """Save stock price data for a symbol"""
        if not symbol or not symbol.strip() or not price_data:
            return 0

        try:
            stock = await self.get_or_create_stock(symbol)
            saved_count = 0

            async with self.get_connection() as conn:
                for data in price_data:
                    try:
                        await conn.execute(
                            """
                            INSERT INTO stock_prices (stock_id, date, open_price, high_price, low_price, close_price, volume)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                            ON CONFLICT (stock_id, date) DO UPDATE SET
                                open_price = EXCLUDED.open_price,
                                high_price = EXCLUDED.high_price,
                                low_price = EXCLUDED.low_price,
                                close_price = EXCLUDED.close_price,
                                volume = EXCLUDED.volume
                        """,
                            stock.id,
                            data["date"],
                            data.get("open"),
                            data.get("high"),
                            data.get("low"),
                            data.get("close"),
                            data.get("volume"),
                        )
                        saved_count += 1
                    except Exception as e:
                        logger.error(
                            f"Error saving price data for {symbol} on {data.get('date')}: {e}"
                        )

            return saved_count
        except Exception as e:
            logger.error(f"Error in save_stock_prices for {symbol}: {e}")
            return 0

    async def get_stock_prices(
        self, symbol: str, days: int = 100
    ) -> List[StockPriceModel]:
        """Get stock price data for a symbol"""
        if not symbol or not symbol.strip():
            return []

        async with self.get_connection() as conn:
            try:
                rows = await conn.fetch(
                    """
                    SELECT sp.*, s.symbol
                    FROM stock_prices sp
                    JOIN stocks s ON sp.stock_id = s.id
                    WHERE s.symbol = $1
                    ORDER BY sp.date DESC
                    LIMIT $2
                """,
                    symbol.upper().strip(),
                    max(1, days),  # Ensure positive limit
                )

                return [StockPriceModel(**dict(row)) for row in rows]
            except Exception as e:
                logger.error(f"Error getting stock prices for {symbol}: {e}")
                return []

    async def get_favorite_symbols(self) -> List[str]:
        """Get all favorite stock symbols for data fetching"""
        async with self.get_connection() as conn:
            try:
                rows = await conn.fetch(
                    """
                    SELECT DISTINCT s.symbol
                    FROM favorites f
                    JOIN stocks s ON f.stock_id = s.id
                """
                )

                return [row["symbol"] for row in rows]
            except Exception as e:
                logger.error(f"Error getting favorite symbols: {e}")
                return []



db_manager = DatabaseManager()
