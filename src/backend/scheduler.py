import asyncio
import logging
from datetime import datetime, timedelta, time
from typing import Dict, Any
import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import db_manager
from main import AlpacaDataClient

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("scheduler.log"), logging.StreamHandler()],
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

            # Initialize Alpaca client
            try:
                self.alpaca_client = AlpacaDataClient()
            except Exception as alpaca_error:
                logger.error(f"Failed to initialize Alpaca client: {alpaca_error}")
                raise

            logger.info("Scheduler initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize scheduler: {e}")
            raise

    async def get_last_price_date(self, symbol: str) -> datetime:
        """Get the last date we have price data for this symbol"""
        try:
            async with db_manager.get_connection() as conn:
                last_date = await conn.fetchval(
                    """
                    SELECT MAX(sp.date) 
                    FROM stock_prices sp
                    JOIN stocks s ON sp.stock_id = s.id
                    WHERE s.symbol = $1
                    """,
                    symbol.upper(),
                )

                if last_date:
                    # Return the day after the last date we have
                    return datetime.combine(last_date, time.min) + timedelta(days=1)
                else:
                    # If no data exists, get last 30 days
                    return datetime.now() - timedelta(days=30)

        except Exception as e:
            logger.error(f"Error getting last price date for {symbol}: {e}")
            # Fallback to last 7 days if error
            return datetime.now() - timedelta(days=7)

    async def fetch_incremental_stock_data(self, symbol: str) -> Dict[str, Any]:
        """Fetch only new data since last update for a single stock symbol"""
        try:
            if self.alpaca_client is None:
                return {
                    "symbol": symbol,
                    "success": False,
                    "error": "Client not initialized",
                }

            logger.info(f"Fetching incremental data for {symbol}")

            # Get the start date (day after last data we have)
            start_date = await self.get_last_price_date(symbol)
            end_date = datetime.now() - timedelta(days=1)  # Yesterday

            # Skip if start_date is after end_date (we're up to date)
            if start_date.date() > end_date.date():
                return {
                    "symbol": symbol,
                    "success": True,
                    "new_records": 0,
                    "message": "Already up to date",
                }

            days_to_fetch = (end_date - start_date).days + 1
            logger.info(
                f"Fetching {days_to_fetch} days of data for {symbol} from {start_date.date()} to {end_date.date()}"
            )

            # Fetches data for specific date range
            result = await self.alpaca_client.get_daily_stock_data_range(
                symbol=symbol,
                start_date=start_date,
                end_date=end_date,
            )

            return {
                "symbol": symbol,
                "success": True,
                "new_records": len(result.data),
                "date_range": f"{start_date.date()} to {end_date.date()}",
            }

        except Exception as e:
            logger.error(f"Failed to fetch incremental data for {symbol}: {e}")
            return {"symbol": symbol, "success": False, "error": str(e)}

    async def update_favorite_stocks(self) -> Dict[str, Any]:
        """Update data for all favorite stocks incrementally"""
        log_id = None

        try:
            # Get all favorite symbols
            favorite_symbols = await db_manager.get_favorite_symbols()

            if not favorite_symbols:
                return {
                    "processed": 0,
                    "failed": 0,
                    "symbols": [],
                    "total_new_records": 0,
                }

            processed = 0
            failed = 0
            failed_symbols = []
            total_new_records = 0
            results = []

            # Process each symbol
            for symbol in favorite_symbols:
                try:
                    result = await self.fetch_incremental_stock_data(symbol)
                    results.append(result)

                    if result["success"]:
                        processed += 1
                        total_new_records += result.get("new_records", 0)
                    else:
                        failed += 1
                        failed_symbols.append(symbol)

                    #  Small delay to avoid rate limiting
                    await asyncio.sleep(1)

                except Exception as e:
                    logger.error(f"Unexpected error processing {symbol}: {e}")
                    failed += 1
                    failed_symbols.append(symbol)

            summary = {
                "processed": processed,
                "failed": failed,
                "total_symbols": len(favorite_symbols),
                "symbols": favorite_symbols,
                "failed_symbols": failed_symbols,
                "total_new_records": total_new_records,
                "results": results,
            }

            return summary

        except Exception as e:
            logger.error(f"Error during incremental update: {e}")
            raise

    async def should_run_update(self) -> bool:
        """Check if we should run the daily update"""
        now = datetime.now()

        # Only run on weekdays (Monday=0, Sunday=6)
        if now.weekday() > 4:  # Saturday or Sunday
            logger.debug("Skipping update - weekend (markets closed)")
            return False

        # Check if we already ran today successfully
        try:
            async with db_manager.get_connection() as conn:
                today_runs = await conn.fetchval(
                    """
                    SELECT COUNT(*) FROM scheduler_logs 
                    WHERE job_type = 'daily_update' 
                    AND DATE(started_at) = CURRENT_DATE
                    AND status IN ('completed', 'partial_success')
                """
                )

                if today_runs > 0:
                    logger.debug("Skipping update - already ran successfully today")
                    return False

                return True

        except Exception as e:
            logger.warning(f"Error checking if update should run: {e}")
            return True

    async def log_scheduler_run(
        self, job_type: str, status: str, result_data: Dict[str, Any]
    ) -> None:
        """Log scheduler run to database"""
        try:
            async with db_manager.get_connection() as conn:
                await conn.execute(
                    """
                    INSERT INTO scheduler_logs (job_type, status, result_data)
                    VALUES ($1, $2, $3)
                    """,
                    job_type,
                    status,
                    result_data,
                )
        except Exception as e:
            logger.error(f"Error logging scheduler run: {e}")

    async def run_scheduler(self):
        """Main scheduler loop"""
        self.running = True
        logger.info("Stock data scheduler started")

        while self.running:
            try:
                if await self.should_run_update():
                    logger.info("Starting daily incremental stock data update")

                    # Run the update
                    result = await self.update_favorite_stocks()

                    # Determine status
                    if result["failed"] == 0:
                        status = "completed"
                    elif result["processed"] > 0:
                        status = "partial_success"
                    else:
                        status = "failed"

                    # Log the result
                    await self.log_scheduler_run("daily_update", status, result)

                    logger.info(f"Daily update result: {result}")
                else:
                    logger.debug("Skipping update - conditions not met")

                # Wait 4 hour before checking again
                await asyncio.sleep(14400)

            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
                # Log the error
                await self.log_scheduler_run("daily_update", "error", {"error": str(e)})
                # Wait 5 minutes on error before retrying
                await asyncio.sleep(300)

    def stop(self):
        """Stop the scheduler"""
        logger.info("Stopping scheduler...")
        self.running = False

    async def run_manual_update(self):
        """Manual update for testing/debugging"""
        logger.info("Running manual incremental update")

        # Ensure client is initialized
        if self.alpaca_client is None:
            logger.error("Alpaca client not initialized. Cannot run manual update.")
            return {"error": "Alpaca client not initialized"}

        result = await self.update_favorite_stocks()

        # Log manual run
        await self.log_scheduler_run("manual_update", "completed", result)

        return result


# Standalone scheduler service
async def main():
    """Main function for running scheduler as a service"""
    scheduler = StockDataScheduler()

    try:
        await scheduler.initialize()

        # Check command line arguments
        if len(sys.argv) > 1:
            if sys.argv[1] == "manual":
                # Run manual update
                result = await scheduler.run_manual_update()
                print(f"Manual update completed: {result}")
            elif sys.argv[1] == "once":
                # Run once and exit
                if await scheduler.should_run_update():
                    result = await scheduler.update_favorite_stocks()
                    await scheduler.log_scheduler_run(
                        "cron_update", "completed", result
                    )
                    print(f"Scheduled update completed: {result}")
                else:
                    print("Update not needed today")
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
