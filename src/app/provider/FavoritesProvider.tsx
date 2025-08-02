"use client";

import React, { createContext, useContext, useEffect } from "react";
import { useFavoritesManager } from "@/lib/util";
import { FavoritesContextType, FavoriteStock } from "@/lib/types/favorites";

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined
);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const {
    favorites,
    favoritesLoading: loading,
    favoritesError: error,
    loadFavorites,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
  } = useFavoritesManager();

  // Wrapper functions to match the interface
  const addFavorite = async (stock: Omit<FavoriteStock, "addedAt">) => {
    try {
      await addToFavorites(stock);
    } catch (err) {
      console.error("Error adding favorite:", err);
    }
  };

  const removeFavorite = async (symbol: string) => {
    try {
      await removeFromFavorites(symbol);
    } catch (err) {
      console.error("Error removing favorite:", err);
    }
  };

  const refreshFavorites = async () => {
    try {
      await loadFavorites();
    } catch (err) {
      console.error("Error refreshing favorites:", err);
    }
  };

  // Load favorites
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // Auto-refresh favorites every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        loadFavorites().catch(console.error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [loading, loadFavorites]);

  const value: FavoritesContextType = {
    favorites,
    loading,
    error,
    addFavorite,
    removeFavorite,
    isFavorite,
    refreshFavorites,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}
