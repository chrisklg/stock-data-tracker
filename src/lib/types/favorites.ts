export interface FavoriteStock {
  symbol: string;
  name?: string;
  addedAt: string;
  lastPrice?: number;
}

export interface FavoritesContextType {
  favorites: FavoriteStock[];
  loading: boolean;
  error: string | null;
  addFavorite: (stock: Omit<FavoriteStock, "addedAt">) => Promise<void>;
  removeFavorite: (symbol: string) => Promise<void>;
  isFavorite: (symbol: string) => boolean;
  refreshFavorites: () => Promise<void>;
}
