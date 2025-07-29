"use client";

import { useState } from "react";
import Header from "../ui/Header";
import StockSearch from "../ui/StockSearch";
import FavoritesWatchlist from "../ui/FavoritesWatchlist";

export default function Page() {
  const [showAddStock, setShowAddStock] = useState(false);

  /**
   * Show add stock form
   */
  const handleShowAddStock = () => {
    setShowAddStock(true);
  };

  /**
   * Hide add stock form and return to dashboard
   */
  const handleBackToDashboard = () => {
    setShowAddStock(false);
  };

  return (
    <>
      {/* Header */}
      <Header />

      <main className="w-full">
        {!showAddStock ? (
          /* Watchlist View */
          <FavoritesWatchlist onAddFavorite={handleShowAddStock} />
        ) : (
          /* Searching new stocks */ 
          <StockSearch onBack={handleBackToDashboard} />
        )}
      </main>
    </>
  );
}
