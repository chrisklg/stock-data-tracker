CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stocks table to store stock metadata
CREATE TABLE stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255),
    exchange VARCHAR(50),
    currency VARCHAR(3) DEFAULT 'USD',
    region VARCHAR(50) DEFAULT 'US',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Favorites table
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stock_id)
);

-- Stock price data table for caching daily prices
CREATE TABLE stock_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    open_price DECIMAL(10, 4),
    high_price DECIMAL(10, 4),
    low_price DECIMAL(10, 4),
    close_price DECIMAL(10, 4),
    volume BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stock_id, date)
);

CREATE TABLE IF NOT EXISTS scheduler_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    result_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Indexes for better performance
CREATE INDEX idx_favorites_stock_id ON favorites(stock_id);
CREATE INDEX idx_stock_prices_stock_date ON stock_prices(stock_id, date);
CREATE INDEX idx_stock_prices_date ON stock_prices(date);
CREATE INDEX idx_stocks_symbol ON stocks(symbol);
CREATE INDEX IF NOT EXISTS idx_scheduler_logs_job_date ON scheduler_logs(job_type, DATE(started_at));
CREATE INDEX IF NOT EXISTS idx_scheduler_logs_status ON scheduler_logs(status);

