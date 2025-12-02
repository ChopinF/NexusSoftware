import React, { useState } from "react";
import "./AddReviewAlertModal.css";
import { Star } from "lucide-react";
import { useUser } from "../../../contexts/UserContext";
import type { Product } from "../../../types/Product";

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  product: Product
}

const AlertModal: React.FC<AlertModalProps> = ({ open, onClose, product }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const { token, user } = useUser();
  const isDisabled = rating === 0 || comment.trim() === "";
  const getStarColor = (rating: number) => {
    if (rating <= 2) return "#f62a2a";
    if (rating === 3) return "#ff7410";
    return "#fbbf24";
  };
  if (!open) return null;
  const handlePost = async () => {


    await addReview(product.id, user!.id, rating, comment);
    onClose();
  };
  async function addReview(productId: string, userId: string, rating: number, comment: string) {
    try {
      const res = await fetch("http://localhost:3000/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Bearer": `${token}`
        },
        body: JSON.stringify({
          productTitle: productId,
          user: userId,
          rating: rating,
          comment: comment
        })
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("Error adding review:", err);

      }

      const data = await res.json();
      console.log("Review added:", data);
      return data;

    } catch (err) {
      console.error("Network error adding review:", err);
      return null;
    }
  }

  return (
    <div className="alert-backdrop" onClick={onClose}>
      <div className="alert-modal" onClick={(e) => e.stopPropagation()}>
        <div className="alert-content">
          <h2 className="alert-title">Post a Review</h2>
        </div>

        <div className="review-info">
          <div className="star-row">
            {[1, 2, 3, 4, 5].map((star) => {
              const activeRating = hover || rating;
              const isFilled = activeRating >= star;
              const color = isFilled ? getStarColor(activeRating) : "none";
              const strokeColor = isFilled ? getStarColor(activeRating) : "currentColor";

              return (
                <Star
                  key={star}
                  size={20}
                  className="star-icon"
                  onClick={() => setRating(star)}
                  strokeWidth={1.5}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  fill={color}
                  stroke={strokeColor}
                  style={{ cursor: "pointer", marginRight: 4 }}
                />
              );
            })}
          </div>
          <textarea
            className="review-comment"
            onChange={(e) => setComment(e.target.value)}

            placeholder="Comment your experience with this product"
          />
        </div>

        <div className="alert-actions">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="post-btn"
            disabled={isDisabled}
            onClick={() => {
              handlePost();
            }}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
