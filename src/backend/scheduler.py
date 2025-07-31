import asyncio
import logging
from datetime import datetime, timedelta, time
from typing import List
import os
import sys
from dotenv import load_dotenv

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import db_manager
from main import AlpacaDataClient

load_dotenv()

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class StockDataScheduler:
    def __init__(self):
        self.alpaca_client = None
        self.running = False

    async def initialize(self):
        """Initialize database and API clients"""
        try:
            await db_manager.initialize()
            
            # Initialize Alpaca client with proper error handling
            try:
                self.alpaca_client = AlpacaDataClient()
                logger.info("Alpaca client initialized successfully")
            except Exception as alpaca_error:
                logger.error(f"Failed to initialize Alpaca client: {alpaca_error}")
                raise
                
            logger.info("Scheduler initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize scheduler: {e}")
            raise

    async def fetch_stock_data(self, symbol: str) -> bool:
        """Fetch and cache data for a single stock symbol"""
        try:
            # Check if alpaca_client is properly initialized
            if self.alpaca_client is None:
                logger.error("Alpaca client is not initialized")
                return False
                
            logger.info(f"Fetching data for {symbol}")

            # Fetch fresh data without using cache
            await self.alpaca_client.get_daily_stock_data(
                symbol=symbol,
                days=360,  # Get last 360 days
                use_cache=False,  # Force fresh fetch
            )

            logger.info(f"Successfully updated data for {symbol}")
            return True

        except Exception as e:
            logger.error(f"Failed to fetch data for {symbol}: {e}")
            return False

    async def update_favorite_stocks(self) -> dict:
        """Update data for all favorite stocks"""
        log_id = None
        
        try:
            
            # Get all favorite symbols
            favorite_symbols = await db_manager.get_favorite_symbols()

            if not favorite_symbols:
                logger.info("No favorite stocks to update")
                return {"processed": 0, "failed": 0, "symbols": []}

            logger.info(f"Updating data for {len(favorite_symbols)} favorite stocks")

            processed = 0
            failed = 0
            failed_symbols = []

            # Process each symbol
            for symbol in favorite_symbols:
                success = await self.fetch_stock_data(symbol)
                if success:
                    processed += 1
                else:
                    failed += 1
                    failed_symbols.append(symbol)

                # Add small delay to avoid rate limiting
                await asyncio.sleep(1)

            logger.info(
                f"Daily update completed: {processed} processed, {failed} failed"
            )

            return {
                "processed": processed,
                "failed": failed,
                "symbols": favorite_symbols,
                "failed_symbols": failed_symbols,
            }

        except Exception as e:
            logger.error(f"Error during daily update: {e}")
            raise

    async def should_run_update(self) -> bool:
        """Check if we should run the daily update"""
        now = datetime.now()

        # Only run on weekdays (Monday=0, Sunday=6)
        if now.weekday() > 4:  # Saturday or Sunday
            logger.debug("Skipping update - weekend")
            return False

        # Run between 6 AM and 8 PM ET
        if now.hour < 6 or now.hour > 20:
            logger.debug(f"Skipping update - outside hours (current: {now.hour})")
            return False

        # Check if we already ran today
        try:
            async with db_manager.get_connection() as conn:
                today_runs = await conn.fetchval(
                    """
                    SELECT COUNT(*) FROM scheduler_logs 
                    WHERE job_type = 'daily_update' 
                    AND DATE(started_at) = CURRENT_DATE
                    AND status IN ('completed', 'partial_failure')
                """
                )

                if today_runs > 0:
                    logger.debug("Skipping update - already ran today")
                    return False
                    
                return True

        except Exception as e:
            logger.error(f"Error checking if update should run: {e}")
            return False

    async def run_scheduler(self):
        """Main scheduler loop"""
        self.running = True
        logger.info("Stock data scheduler started")

        while self.running:
            try:
                if await self.should_run_update():
                    logger.info("Starting daily stock data update")
                    result = await self.update_favorite_stocks()
                    logger.info(f"Daily update result: {result}")
                else:
                    logger.debug("Skipping update - conditions not met")

                # Wait 1 hour before checking again
                await asyncio.sleep(3600)

            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
                await asyncio.sleep(300)  # Wait 5 minutes on error

    def stop(self):
        """Stop the scheduler"""
        logger.info("Stopping scheduler...")
        self.running = False

    async def run_manual_update(self):
        """Manual update for testing/debugging"""
        logger.info("Running manual update")
        
        # Ensure client is initialized
        if self.alpaca_client is None:
            logger.error("Alpaca client not initialized. Cannot run manual update.")
            return {"error": "Alpaca client not initialized"}
            
        result = await self.update_favorite_stocks()
        return result


# Standalone scheduler service
async def main():
    """Main function for running scheduler as a service"""
    scheduler = StockDataScheduler()

    try:
        await scheduler.initialize()

        # Check command line arguments
        if len(sys.argv) > 1 and sys.argv[1] == "manual":
            # Run manual update
            result = await scheduler.run_manual_update()
            print(f"Manual update completed: {result}")
        else:
            # Run continuous scheduler
            await scheduler.run_scheduler()

    except KeyboardInterrupt:
        logger.info("Scheduler interrupted by user")
    except Exception as e:
        logger.error(f"Scheduler error: {e}")
    finally:
        scheduler.stop()
        await db_manager.close()


if __name__ == "__main__":
    asyncio.run(main())