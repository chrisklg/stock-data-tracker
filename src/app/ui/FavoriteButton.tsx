"use client";

import { Crown } from "lucide-react";
import { FavoriteStock } from "@/lib/types/favorites";
import { useFavorites } from "../provider/FavoritesProvider";

interface FavoriteButtonProps {
  stock: {
    symbol: string;
    name?: string;
    lastPrice?: number;
  };
  className?: string;
  size?: number;
}

export default function FavoriteButton({
  stock,
  className = "",
  size = 24,
}: FavoriteButtonProps) {
  const { addFavorite, removeFavorite, isFavorite, loading } = useFavorites();

  const isCurrentlyFavorite = isFavorite(stock.symbol);

  const handleToggleFavorite = () => {
    if (loading) return;

    if (isCurrentlyFavorite) {
      removeFavorite(stock.symbol);
    } else {
      const favoriteStock: FavoriteStock = {
        symbol: stock.symbol,
        name: stock.name,
        addedAt: new Date().toISOString(),
        lastPrice: stock.lastPrice,
      };
      addFavorite(favoriteStock);
    }
  };

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={loading}
      className={`
        transition-all duration-200 ease-in-out
        hover:scale-110 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        p-2 rounded-full hover:bg-gray-100
        ${className}
      `}
      title={isCurrentlyFavorite ? "Remove from favorites" : "Add to favorites"}
      aria-label={
        isCurrentlyFavorite ? "Remove from favorites" : "Add to favorites"
      }
    >
      <Crown
        size={size}
        className={`
          transition-colors duration-200
          ${
            isCurrentlyFavorite
              ? "fill-red-500 text-red-500"
              : "text-gray-400 hover:text-yellow-500"
          }
        `}
      />
    </button>
  );
}
