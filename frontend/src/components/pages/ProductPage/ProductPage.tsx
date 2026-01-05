import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from "react-router-dom";
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate";
import { Spinner } from "../../atoms/Spinner/Spinner";
import { PriceComparisonWidget } from "../../molecules/PriceComparisonWidget/PriceComparisonWidget";
import ProductContent from "../../organisms/ProductContent/ProductContent";
import ReviewsList from "../../molecules/ReviewList/ReviewList";
import AlertModal from './AddReviewAlertModal';
import { useFavorite } from "../../../hooks/useFavorite";
import { useUser } from "../../../contexts/UserContext";
import { API_URL } from "../../../config";
import type { Product } from "../../../types/Product";
import type { Review } from "../../../types/Review";
import type { PriceComparisonData } from "../../../types/PriceComparison";
import RecentDealsWidget from "../../molecules/RecentDealsWidget/RecentDealsWidget";
import './ProductPage.css';

const ProductPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useUser();
    
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState<Product | null>(null);
    const [reviews, setReviews] = useState<Review[] | null>(null);
    const [alertOpen, setAlertOpen] = useState(false);
    
    const [priceComparison, setPriceComparison] = useState<PriceComparisonData | null>(null);
    const [loadingComparison, setLoadingComparison] = useState(false);

    const { toggleFavoriteApi } = useFavorite();

    const fetchProduct = useCallback(() => {
        const token = localStorage.getItem("token");
        const headers: HeadersInit = token ? { "Authorization": `Bearer ${token}` } : {};

        fetch(`${API_URL}/product/` + id, { headers })
            .then((res) => res.json())
            .then((data) => setProduct(data))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, [id]);

    const fetchReviews = useCallback(() => {
        if (!id) return;
        fetch(`${API_URL}/product/` + id + "/reviews")
            .then((res) => res.json())
            .then((data) => setReviews(data.reviews))
            .catch((err) => console.error(err));
    }, [id]);

    const fetchPriceComparison = useCallback(() => {
        if (!id) return;
        setLoadingComparison(true);
        fetch(`${API_URL}/product/${id}/price-comparison`)
            .then((res) => {
                if (!res.ok) throw new Error("Comparison failed");
                return res.json();
            })
            .then((data) => setPriceComparison(data))
            .catch((err) => console.error(err))
            .finally(() => setLoadingComparison(false));
    }, [id]);

    useEffect(() => {
        fetchProduct();
        fetchReviews();
        fetchPriceComparison();
    }, [fetchProduct, fetchReviews, fetchPriceComparison]);

    const handleToggleFavorite = async () => {
        if (!product) return;
        const token = localStorage.getItem("token");
        
        if (!token) {
            alert("Trebuie să fii autentificat pentru a adăuga la favorite.");
            return;
        }

        const nextStatus = !product.isFavorite;
        setProduct(prev => prev ? { ...prev, isFavorite: nextStatus } : null);

        const success = await toggleFavoriteApi(product.id, nextStatus);

        if (success) {
            window.dispatchEvent(new Event("products-updated-signal"));
        } else {
            setProduct(prev => prev ? { ...prev, isFavorite: !nextStatus } : null);
            alert("A apărut o eroare. Încearcă din nou.");
        }
    };

    if (loading || !product) {
        return (
            <MainTemplate>
                <div className="loading-container">
                    <Spinner size="lg" />
                </div>
            </MainTemplate>
        );
    }

    const isOwner = user && user.id === product.seller_id;

    return (
        <MainTemplate>
            <div className="product-page">
                
                <section className="product-section">
                    <ProductContent 
                        product={product} 
                        onToggleFavorite={handleToggleFavorite} 
                    />
                    
                    {isOwner && id && (
                        <RecentDealsWidget productId={id} />
                    )}
                </section>

                <section className="widget-section">
                    <PriceComparisonWidget 
                        currentPrice={product.price}
                        data={priceComparison}
                        loading={loadingComparison}
                    />
                </section>

                <section className="reviews-section">
                    <div className="reviews-header">
                        <h2>Reviews ({reviews?.length || 0})</h2>
                        <button 
                            className='add-review-btn'
                            onClick={() => setAlertOpen(true)}
                        >
                            Write a Review
                        </button>
                    </div>

                    <div className="reviews-list-wrapper">
                        {reviews && reviews.length > 0 ? (
                            <ReviewsList reviews={reviews} />
                        ) : (
                            <p className="no-reviews-text">No reviews yet. Be the first to share your opinion!</p>
                        )}
                    </div>
                </section>

                <AlertModal
                    open={alertOpen}
                    product={product}
                    onClose={() => setAlertOpen(false)}
                    onSuccess={() => fetchReviews()}
                />
            </div>
        </MainTemplate>
    );
};

export default ProductPage;