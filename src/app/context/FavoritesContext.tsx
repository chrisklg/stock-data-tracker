"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { FavoriteStock, FavoritesContextType } from "@/lib/types/favorites";

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined
);

const FAVORITES_STORAGE_KEY = "stock-tracker-favorites";

interface FavoritesProviderProps {
  children: ReactNode;
}

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const [favorites, setFavorites] = useState<FavoriteStock[]>([]);
  const [loading, setLoading] = useState(true);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsedFavorites = JSON.parse(stored) as FavoriteStock[];
        setFavorites(parsedFavorites);
      }
    } catch (error) {
      console.error("Error loading favorites from localStorage:", error);
      // Reset localStorage if corrupted
      localStorage.removeItem(FAVORITES_STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save favorites to localStorage whenever favorites change
  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
      } catch (error) {
        console.error("Error saving favorites to localStorage:", error);
      }
    }
  }, [favorites, loading]);

  // Add stock to favorite storage
  const addFavorite = (stock: FavoriteStock) => {
    setFavorites((prev) => {
      // Check if already exists
      const exists = prev.some((fav) => fav.symbol === stock.symbol);
      if (exists) {
        return prev;
      }

      const newFavorite: FavoriteStock = {
        ...stock,
        addedAt: new Date().toISOString(),
      };
      const newFavorites = [...prev, newFavorite];

      return newFavorites;
    });
  };
  // Remove existing favorite
  const removeFavorite = (symbol: string) => {
    setFavorites((prev) => {
      const exists = prev.some((fav) => fav.symbol === symbol);
      if (!exists) {
        return prev;
      }

      const filtered = prev.filter((fav) => fav.symbol !== symbol);

      return filtered;
    });
  };

  // Check if stock set as favorite
  const isFavorite = (symbol: string): boolean => {
    return favorites.some((fav) => fav.symbol === symbol);
  };

  const value: FavoritesContextType = {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    loading,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

// Custom hook to use favorites context
export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}
