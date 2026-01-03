import React, { useState, useEffect } from "react";
import styles from "./ProductCard.module.css";
import type { Product } from "../../../types/Product";
import { API_URL } from "../../../config";
import { useFavorite } from "../../../hooks/useFavorite";

const HeartIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
  </svg>
);

const Link: React.FC<{ href: string; className: string; children: React.ReactNode }> = ({ href, className, children }) => (
  <a href={href} className={className}>{children}</a>
);

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
      alert("Te rog autentifică-te.");
      return;
    }

    const nextState = !isFavorite;
    setIsFavorited(nextState);

    const success = await toggleFavoriteApi(product.id, nextState);

    if (success) {
      if (onToggleFavorite) {
        onToggleFavorite(product.id, nextState);
      }
      
      window.dispatchEvent(new Event("products-updated-signal"));
    } else {
      setIsFavorited(!nextState);
      alert("A apărut o eroare. Încearcă din nou.");
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
    <Link href={`/product/${product.id}`} className={styles.cardLink}>
      {isAuthenticated && (
        <button
          type="button"
          className={`${styles.favoriteButton} ${isFavorite ? styles.favorited : ""}`}
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <HeartIcon />
        </button>
      )}

      <div className={styles.imageWrapper}>
        <img
          src={imageUrl}
          alt={product.title}
          className={styles.productImage}
          onError={(e) => (e.currentTarget.src = "https://placehold.co/400x300/f3f4f6/6b7280?text=Image+Not+Found")}
        />
      </div>

      <div className={styles.detailsWrapper}>
        <span className={styles.price}>{formatPrice(product.price)}</span>
        <h3 className={styles.title}>{product.title}</h3>
      </div>
    </Link>
  );
};