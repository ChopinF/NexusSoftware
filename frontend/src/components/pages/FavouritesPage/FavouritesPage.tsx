import React, { useEffect, useState, useCallback } from "react";
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate";
import { ProductCard } from "../../organisms/ProductCard/ProductCard";
import { Spinner } from "../../atoms/Spinner/Spinner";
import { Heart } from "lucide-react"; // Am adăugat Heart pentru empty state
import type { Product } from "../../../types/Product";
import { API_URL } from "../../../config";

import styles from "./FavouritesPage.module.css";

export const FavouritesPage: React.FC = () => {
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/my-favorites`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const formattedData = data.map((p: any) => ({
          ...p,
          isFavorite: true,
        }));
        setFavorites(formattedData);
      }
    } catch (err) {
      console.error("Error fetching favorites:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleRemoveFromList = (productId: string, isFavorite: boolean) => {
    if (!isFavorite) {
      setFavorites((prevFavorites) =>
        prevFavorites.filter((prod) => prod.id !== productId)
      );
    }
  };

  return (
    <MainTemplate>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h1>Favorite Posts</h1>
            {favorites.length > 0 && (
              <span className={styles.badgeCount}>{favorites.length}</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className={styles.loader}>
            <Spinner size="lg" />
          </div>
        ) : (
          <div className={styles.grid}>
            {favorites.length > 0 ? (
              favorites.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onToggleFavorite={handleRemoveFromList}
                />
              ))
            ) : (
              <div className={styles.emptyState}>
                <Heart size={48} style={{ opacity: 0.5 }} />
                <h3>No favorites yet</h3>
                <p>Explore our products and heart the ones you love!</p>
                <a href="/" className={styles.browseLink}>
                  Browse Products
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </MainTemplate>
  );
};