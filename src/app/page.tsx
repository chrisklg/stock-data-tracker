import Link from "next/link";
import {
  TrendingUp,
  Database,
  Clock,
  BarChart3,
  Star,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center items-center gap-3 mb-6">
            <TrendingUp className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">
              Stock Data Tracker
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A personal stock market data tracking application built as learning
            unit
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-6 h-6 text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Favorites Management
              </h3>
            </div>
            <p className="text-gray-600">
              Add your favorite stocks to a personalized watchlist for quick
              monitoring
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-6 h-6 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Limitation: Alpaca API is limited for US stocks
              </h3>
            </div>
            <p className="text-gray-600">
              Access up-to-date stock prices and historical data fetched by
              Alpaca API
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Data Caching
              </h3>
            </div>
            <p className="text-gray-600">
              Caching system with PostgreSQL for reducing API calls
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Automated Updates
              </h3>
            </div>
            <p className="text-gray-600">
              Daily automated data fetching keeps your stock information current
              without manual intervention
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Stock Search
              </h3>
            </div>
            <p className="text-gray-600">
              Search stocks by company name, symbol, or WKN
            </p>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="bg-white rounded-lg p-8 shadow-md mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Built With
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Frontend</h4>
              <p className="text-gray-600 text-sm">
                Next.js 15, React, TypeScript, Tailwind CSS, Lightweight-Charts
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Backend</h4>
              <p className="text-gray-600 text-sm">Python, FastAPI, Asyncio</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Database</h4>
              <p className="text-gray-600 text-sm">PostgreSQL, Asyncpg</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Data Source</h4>
              <p className="text-gray-600 text-sm">Alpaca Markets API</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-white rounded-lg p-8 shadow-md inline-block">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Let's create your Watchlist
            </h2>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Watchlist
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500 text-sm">
          <p>Stock Data Tracker - Watchlist</p>
        </div>
      </div>
    </div>
  );
}
