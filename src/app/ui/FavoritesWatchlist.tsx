import { useFavorites } from "@/app/context/FavoritesContext";
import { Crown, Plus } from "lucide-react";
import MiniCandlestickChart from "./MiniCandlestickChart";

interface FFavoritesWatchlistProps {
  onAddFavorite?: () => void;
}

export default function FavoritesWatchlist({
  onAddFavorite,
}: FFavoritesWatchlistProps) {
  const { favorites, loading } = useFavorites();

  if (loading) {
    return (
      <div className="w-full p-6">
        <div className="flex items-center gap-3 mb-6">
          <Crown className="text-yellow-500" size={28} />
          <h2 className="text-2xl font-bold text-gray-900">
            Favorites Dashboard
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-gray-200 rounded-lg animate-pulse"
              style={{ height: "300px" }}
            >
              <div className="p-4">
                <div className="h-6 bg-gray-300 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Crown className="text-yellow-500" size={28} />
            <h2 className="text-2xl font-bold text-gray-900">
              Favorites Watchlist
            </h2>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Crown className="text-gray-400" size={40} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Favorites Yet
          </h3>
          <p className="text-gray-500 text-center max-w-md mb-6">
            Search for stocks and click the crown icon to add them to your
            watchlist. You'll see mini charts for each favorite here.
          </p>
          {onAddFavorite && (
            <button
              onClick={onAddFavorite}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus size={20} />
              Add your first Favorite to Watchlist
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Crown className="text-yellow-500" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Watchlist</h2>
            <p className="text-gray-600">
              {favorites.length} stock{favorites.length !== 1 ? "s" : ""}{" "}
              favorites
            </p>
          </div>
        </div>

        {onAddFavorite && (
          <button
            onClick={onAddFavorite}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus size={20} />
            Add Stock
          </button>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((favorite) => (
          <MiniCandlestickChart
            key={favorite.symbol}
            symbol={favorite.symbol}
            height={350}
          />
        ))}
      </div>
    </div>
  );
}
