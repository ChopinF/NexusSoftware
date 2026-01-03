import React, { useEffect, useState, useCallback } from 'react';
import './ProductPage.css';
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate.tsx";
import { useParams } from "react-router-dom";
import { Spinner } from "../../atoms/Spinner/Spinner.tsx";
import ReviewsList from "../../molecules/ReviewList/ReviewList.tsx";
import type { Product } from "../../../types/Product.ts";
import ProductContent from "../../organisms/ProductContent/ProductContent.tsx";
import type { Review } from "../../../types/Review.ts";
import AlertModal from './AddReviewAlertModal.tsx';
import { API_URL } from "../../../config";
// 1. Importăm hook-ul nostru
import { useFavorite } from "../../../hooks/useFavorite"; 

const ProductPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState<Product | null>(null);
    const [reviews, setReviews] = useState<Review[] | null>(null);
    const [alertOpen, setAlertOpen] = useState(false);

    // 2. Inițializăm hook-ul
    const { toggleFavoriteApi } = useFavorite();

    const fetchProduct = useCallback(() => {
        // 3. Trimitem token-ul pentru a primi statusul corect de 'isFavorite'
        const token = localStorage.getItem("token");
        const headers: HeadersInit = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        fetch(`${API_URL}/product/` + id, { headers }) // Adăugăm headers
            .then((res) => res.json())
            .then((data) => {
                // Backend-ul returnează acum { ..., isFavorite: true/false }
                setProduct(data);
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, [id]);

    const fetchReviews = useCallback(() => {
        if (!id) return;
        fetch(`${API_URL}/product/` + id + "/reviews")
            .then((res) => res.json())
            .then((data) => {
                setReviews(data.reviews);
            })
            .catch((err) => console.error(err));
    }, [id]);

    useEffect(() => {
        fetchProduct();
        fetchReviews();
    }, [fetchProduct, fetchReviews]); // Am adăugat fetchProduct la dependencies

    // 4. Funcția care gestionează Click-ul pe inimă
    const handleToggleFavorite = async () => {
        if (!product) return;

        const token = localStorage.getItem("token");
        if (!token) {
            alert("Trebuie să fii autentificat pentru a adăuga la favorite.");
            return;
        }

        const currentStatus = product.isFavorite;
        const nextStatus = !currentStatus;

        // A. Optimistic UI Update (Actualizăm starea locală instant)
        setProduct(prev => prev ? { ...prev, isFavorite: nextStatus } : null);

        // B. Apelăm API-ul
        const success = await toggleFavoriteApi(product.id, nextStatus);

        if (success) {
            // Trimitem semnal global pentru alte componente
            window.dispatchEvent(new Event("products-updated-signal"));
        } else {
            // C. Rollback în caz de eroare
            setProduct(prev => prev ? { ...prev, isFavorite: currentStatus } : null);
            alert("A apărut o eroare. Încearcă din nou.");
        }
    };

    return (
        <MainTemplate>
            <div className="product-page">
                {loading || !product ? (
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: "40vh",
                        }}
                    >
                        <Spinner size="lg" />
                    </div>
                ) : (
                    // 5. Trimitem funcția către ProductContent
                    // (Va trebui să actualizezi ProductContent să accepte acest prop)
                    <ProductContent 
                        product={product} 
                        onToggleFavorite={handleToggleFavorite} 
                    />
                )}
                
                {reviews && <ReviewsList reviews={reviews} />}

                <button className='add-review-btn'
                    style={{ margin: "20px", padding: "10px 20px" }}
                    onClick={() => setAlertOpen(true)}
                >
                    Write a Review
                </button>

                <AlertModal
                    open={alertOpen}
                    product={product!}
                    onClose={() => setAlertOpen(false)}
                    onSuccess={() => {
                        fetchReviews();
                    }}
                />
            </div>
        </MainTemplate>
    );
};

export default ProductPage;