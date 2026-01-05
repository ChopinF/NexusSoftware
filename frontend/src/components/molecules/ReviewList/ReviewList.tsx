import React, { useState } from "react";
import "./ReviewList.css";
import {Star} from "lucide-react";

interface Review {
    id: string;
    user_name: string;
    user_email: string;
    rating: number;
    comment: string;
}

interface ReviewsListProps {
    reviews: Review[];
}

const ReviewsList: React.FC<ReviewsListProps> = ({ reviews }) => {
    const [visibleCount, setVisibleCount] = useState(5);

    const handleLoadMore = () => {
        setVisibleCount((prev) => prev + 5);
    };

    const visibleReviews = reviews.slice(0, visibleCount);

    const getStarColor = (rating: number) => {
        if (rating <= 2) return "#f62a2a";
        if (rating === 3) return "#ff7410";
        return "#fbbf24";
    };


    return (
        <div className="reviews-container">
            {reviews.length > 0 ? (
                <h2 className="reviews-title">Reviews ({reviews.length})</h2>
            ) : (
                <h2 className="reviews-title">No reviews</h2>
            )}

            {visibleReviews.map((r) => (
                <div key={r.id} className="review-card">
                    <div className="review-header">
                        <span className="review-user">{r.user_name}</span>
                        <span className="review-rating">
              <Star size={16} fill={getStarColor(r.rating)} stroke={getStarColor(r.rating)} />{" "}
                            {r.rating}/5
            </span>
                    </div>
                    <p className="review-comment">{r.comment}</p>
                    <p className="review-email">{r.user_email}</p>
                </div>
            ))}

            {visibleCount < reviews.length && (
                <button className="load-more-btn" onClick={handleLoadMore}>
                    Load more
                </button>
            )}
        </div>
    );
};

export default ReviewsList;
