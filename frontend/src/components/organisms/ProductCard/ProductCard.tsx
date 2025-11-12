import React, { useState } from "react";
import styles from "./ProductCard.module.css";
import type {Product} from "../../../types/Product.ts";

const API_URL = "http://localhost:3000";

const HeartIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
    />
  </svg>
);

const Link: React.FC<{
  href: string;
  className: string;
  children: React.ReactNode;
}> = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
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

  const handleFavoriteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const newFavoriteState = !isFavorite;
    setIsFavorited(newFavoriteState);

    if (onToggleFavorite) {
      onToggleFavorite(product.id, newFavoriteState);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "RON",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const imageUrl = product.imageUrl 
    ? `${API_URL}${product.imageUrl}`
    : "";

  return (
    <Link href={`/product/${product.id}`} className={styles.cardLink}>
      <button
        type="button"
        className={`${styles.favoriteButton} ${
          isFavorite ? styles.favorited : ""
        }`}
        onClick={handleFavoriteClick}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <HeartIcon />
      </button>

      <div className={styles.imageWrapper}>
        <img
          src={imageUrl}
          alt={product.title}
          className={styles.productImage}
          onError={(e) =>
            (e.currentTarget.src =
              "[https://placehold.co/400x300/f3f4f6/6b7280?text=Image+Not+Found](https://placehold.co/400x300/f3f4f6/6b7280?text=Image+Not+Found)")
          }
        />
      </div>

      <div className={styles.detailsWrapper}>
        <span className={styles.price}>{formatPrice(product.price)}</span>
        <h3 className={styles.title}>{product.title}</h3>

      </div>
    </Link>
  );
};
