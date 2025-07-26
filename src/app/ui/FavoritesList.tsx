"use client";

import { useFavorites } from "@/app/context/FavoritesContext";
import { Crown, X } from "lucide-react";

interface FavoritesListProps {
  onSelectStock?: (symbol: string) => void;
  className?: string;
}

export default function FavoritesList({
  onSelectStock,
  className = "",
}: FavoritesListProps) {
  const { favorites, removeFavorite, loading } = useFavorites();

  const Header = () => (
    <>
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Crown className="text-yellow-500" size={20} />
        Favorite Stocks
      </h3>
    </>
  );

  if (loading) {
    return (
      <div className={`bg-white border rounded-lg p-4 ${className}`}>
        <Header />
        <div className="text-gray-500 text-sm">Loading favorites...</div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className={`bg-white border rounded-lg p-4 ${className}`}>
        <Header />
        <div className="text-gray-500 text-sm">
          No favorites yet. Click the crown icon on any stock to add it to your
          favorites!
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="flex flex-row">
        <Header />
        <p className="ml-2">({favorites.length})</p>
      </div>

      <div className="space-y-2">
        {favorites.map((favorite) => (
          <div
            key={favorite.symbol}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div
              className={`flex-1 ${onSelectStock ? "cursor-pointer" : ""}`}
              onClick={() => onSelectStock?.(favorite.symbol)}
            >
              <div className="font-medium text-gray-900">{favorite.symbol}</div>
              {favorite.name && (
                <div className="text-sm text-gray-600">{favorite.name}</div>
              )}
              <div className="text-xs text-gray-500">
                Added: {new Date(favorite.addedAt).toLocaleDateString()}
              </div>
              {favorite.lastPrice && (
                <div className="text-sm font-medium text-green-600">
                  ${favorite.lastPrice.toFixed(2)}
                </div>
              )}
            </div>

            <button
              onClick={() => removeFavorite(favorite.symbol)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
              title="Remove from favorites"
              aria-label="Remove from favorites"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-gray-500">
        {onSelectStock && "Click on any favorite to view its data"}
      </div>
    </div>
  );
}
