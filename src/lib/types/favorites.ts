export interface FavoriteStock {
  symbol: string;
  name?: string;
  addedAt: string;
  lastPrice?: number;
}

export interface FavoritesContextType {
  favorites: FavoriteStock[];
  addFavorite: (stock: FavoriteStock) => void;
  removeFavorite: (symbol: string) => void;
  isFavorite: (symbol: string) => boolean;
  loading: boolean;
}
