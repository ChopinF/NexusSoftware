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

const ProductPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState<Product | null>(null);
    const [reviews, setReviews] = useState<Review[] | null>(null);
    const [alertOpen, setAlertOpen] = useState(false);

    const fetchProduct = () => {
        fetch("http://localhost:3000/product/" + id)
            .then((res) => res.json())
            .then((data) => {
                setProduct(data);
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    };

    const fetchReviews = useCallback(() => {
        if (!id) return;
        fetch("http://localhost:3000/product/" + id + "/reviews")
            .then((res) => res.json())
            .then((data) => {
                setReviews(data.reviews);
            })
            .catch((err) => console.error(err));
    }, [id]);

    useEffect(() => {
        fetchProduct();
        fetchReviews();
    }, [id, fetchReviews]);

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
                    <ProductContent product={product} />
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
                        // Refresh reviews list without reloading page
                        fetchReviews();
                    }}
                />
            </div>
        </MainTemplate>
    );
};

export default ProductPage;