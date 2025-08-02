# Stock Data Tracker

A full-stack application for tracking and visualizing stock market data with historical data charts, favorites management.

## Prerequisites

- **Docker** and **Docker Compose** installed
- **Alpaca API Account** (free tier available)
- **Git** for cloning the repository

## Getting Alpaca API Keys

1. Visit [Alpaca Markets](https://alpaca.markets/)
2. Sign up for a free account
3. Navigate to **Paper Trading** (for testing) or **Live Trading**
4. Go to **API Keys** section in your dashboard
5. Generate new API keys:
   - `API Key ID` (this is your `ALPACA_API_KEY`)
   - `Secret Key` (this is your `ALPACA_SECRET_KEY`)
6. Copy both keys - you'll need them for the `.env` setup


## Setup

### 1. Root Environment Variables

Copy the example environment file and customize it:

```bash
cp .env.example .env
```

Edit the root `.env` file with your settings:

```env
# Database Configuration
POSTGRES_DB=stock_app
POSTGRES_USER=adminUser
POSTGRES_PASSWORD=your_secure_password

# Application Settings
NODE_ENV=development
NEXT_PUBLIC_APP_NAME=Stock Data Tracker

# API URLs (for local development)
NEXT_PUBLIC_API_URL=http://localhost:8000
PYTHON_BACKEND_URL=http://localhost:8000
```

### 2. Backend Environment Variables

Create the backend environment file:

```bash
cp src/backend/.env.example src/backend/.env
```

Edit `src/backend/.env` with your Alpaca API credentials:

```env
# Alpaca API Configuration
ALPACA_API_KEY=your_alpaca_api_key_here
ALPACA_SECRET_KEY=your_alpaca_secret_key_here
ALPACA_BASE_URL=https://paper-api.alpaca.markets

# Database Configuration (will be overridden by Docker)
DATABASE_URL=postgresql://adminUser:your_secure_password@localhost:5432/stock_app
```

## Getting Started

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd stock-data-tracker
   ```

2. **Set up environment variables** (see Environment Setup above)

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000
   - **Database**: localhost:5432

### Development Setup

For local development without Docker:

1. **Start the database**
   ```bash
   docker-compose up postgres -d
   ```

2. **Start the backend**
   ```bash
   cd src/backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python main.py
   ```

3. **Start the frontend**
   ```bash
   pnpm install
   pnpm dev
   ```

### Database Schema

The application automatically creates the required tables on startup:
- `stocks` - Stock metadata and information
- `daily_data` - Historical daily stock data
- `favorites` - User's favorite stocks

## Available Scripts

### Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up --build -d

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
```

### Frontend Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint
```

### Backend Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Start development server
python main.py

# Run with hot reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### API Endpoints

The backend provides the following main endpoints:

- `GET /api/stocks` - Get stock data with historical prices
- `GET /api/search` - Search for stocks by symbol or name
- `GET /api/favorites` - Get user's favorite stocks
- `POST /api/favorites` - Add stock to favorites
- `DELETE /api/favorites/{symbol}` - Remove stock from favorites
- `GET /api/stats` - Get API usage statistics

---------------

**Happy Trading!**