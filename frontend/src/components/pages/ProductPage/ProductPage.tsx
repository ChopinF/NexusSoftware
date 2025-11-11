import React, {useEffect, useState} from 'react';
import './ProductPage.css';
import {MainTemplate} from "../../templates/MainTemplate/MainTemplate.tsx";
import {useParams} from "react-router-dom";
import {Spinner} from "../../atoms/Spinner/Spinner.tsx";
import ReviewsList from "../../molecules/ReviewList/ReviewList.tsx";
import type {Product} from "../../../types/Product.ts";
import ProductContent from "../../organisms/ProductContent/ProductContent.tsx";
import type {Review} from "../../../types/Review.ts";

const ProductPage: React.FC = () => {
    const {id} = useParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState<Product | null>(null);
    const [reviews, setReviews] = useState<Review[] | null>(null);

    useEffect(() => {
        fetch("http://localhost:3000/product/" + id)
            .then((res) => res.json())
            .then((data) => {
                setProduct(data);
                console.log("Fetched products:", data);
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if(!id)return;
        fetch("http://localhost:3000/product/" + id + "/reviews")
            .then((res) => res.json())
            .then((data) => {
                setReviews(data.reviews);
                console.log("Fetched reviews:", data.reviews);
            })
            .catch((err) => console.error(err));
    }, []);

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
                        <Spinner size="lg"/>
                    </div>
                ) : (
                    <ProductContent product={product}/>
                )}
                {reviews && (
                    <ReviewsList reviews={reviews} />
                )}
            </div>
        </MainTemplate>
    );
};

export default ProductPage;