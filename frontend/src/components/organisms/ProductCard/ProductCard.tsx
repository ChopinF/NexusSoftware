import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./ProductCard.module.css";
import type { Product } from "../../../types/Product";
import { API_URL } from "../../../config";
import { useFavorite } from "../../../hooks/useFavorite";
import { Heart } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onToggleFavorite?: (productId: string, isFavorite: boolean) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onToggleFavorite,
}) => {
  const [isFavorite, setIsFavorited] = useState(product.isFavorite);
  const isAuthenticated = !!localStorage.getItem("token");
  const { toggleFavoriteApi } = useFavorite();

  useEffect(() => {
    setIsFavorited(product.isFavorite);
  }, [product.isFavorite]);

  const handleFavoriteClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      alert("Te rog autentifică-te pentru a adăuga la favorite.");
      return;
    }

    const nextState = !isFavorite;
    setIsFavorited(nextState);

    const success = await toggleFavoriteApi(product.id, nextState);
    if (success) {
      if (onToggleFavorite) onToggleFavorite(product.id, nextState);
      window.dispatchEvent(new Event("products-updated-signal"));
    } else {
      setIsFavorited(!nextState);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "RON",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const imageUrl = product.imageUrl ? `${API_URL}${product.imageUrl}` : "";

  return (
    <Link to={`/product/${product.id}`} className={styles.cardLink}>
      <div className={styles.imageWrapper}>
        <img
          src={imageUrl}
          alt={product.title}
          className={styles.productImage}
          onError={(e) => (e.currentTarget.src = "https://placehold.co/400x400/1f2937/6b7280?text=No+Image")}
        />
        
        {isAuthenticated && (
          <button
            type="button"
            className={`${styles.favoriteButton} ${isFavorite ? styles.favorited : ""}`}
            onClick={handleFavoriteClick}
          >
            <Heart 
              size={20} 
              color={isFavorite ? "#ef4444" : "#ffffff"} 
              fill={isFavorite ? "#ef4444" : "none"} 
              strokeWidth={2.5}
            />
          </button>
        )}
      </div>

      <div className={styles.detailsWrapper}>
        <span className={styles.categoryBadge}>{product.category || "General"}</span>
        <h3 className={styles.title}>{product.title}</h3>
        <span className={styles.price}>{formatPrice(product.price)}</span>
      </div>
    </Link>
  );
};