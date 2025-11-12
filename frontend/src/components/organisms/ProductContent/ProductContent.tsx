import FavoriteButton from "../../atoms/FavoriteButton/FavoriteButton.tsx";
import CategoryBadge from "../../atoms/CategoryBadge/CategoryBadge.tsx";
import type {Product} from "../../../types/Product.ts";
import {useState} from "react";
import SellerCard from "../../molecules/SellerCard/SellerCard.tsx";
import "./ProductContent.css"

const API_URL = "http://localhost:3000";

const ProductHeader: React.FC<{
    title: string;
    category: string;
    isFavorite: boolean;
    onFavoriteClick: () => void;
}> = ({title, category, isFavorite, onFavoriteClick}) => (
    <div className="product-header">
        <div className="header-top">
            <h1 className="product-title">
                {title}
            </h1>
            <FavoriteButton isFavorite={isFavorite} onClick={onFavoriteClick}/>
        </div>
        <CategoryBadge category={category}/>
    </div>
);

const ProductDetails: React.FC<{
    description: string;
    price: number;
}> = ({description, price}) => (
    <div className="product-details">
        <div className="price-tag">
            {price} RON
        </div>
        <p className="product-description">
            {description}
        </p>
    </div>
);

const ProductContent: React.FC<{ product: Product }> = ({product}) => {
    const [isFavorite, setIsFavorite] = useState(false);

    const imageUrl = product.imageUrl 
    ? `${API_URL}${product.imageUrl}` 
    : null;

    return (
        <div className="product-content">
            <div className="image-column">
                <div className="product-image">
                    {imageUrl ? (
                        <img src={imageUrl} alt={product.title}/>
                    ) : (
                        <span className="no-image">No Image Available</span>
                    )}
                </div>
            </div>

            <div className="details-column">
                <ProductHeader
                    title={product.title}
                    category={product.category}
                    isFavorite={isFavorite}
                    onFavoriteClick={() => setIsFavorite(!isFavorite)}
                />

                <ProductDetails
                    description={product.description}
                    price={product.price}
                />

                <SellerCard name={product.seller_name}
                            email={product.seller_email}
                            role={product.seller_role}
                            country={product.seller_country}
                            city={product.seller_city}
                />
            </div>
        </div>
    );
};

export default ProductContent;
