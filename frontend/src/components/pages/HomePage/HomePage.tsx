import React, { useEffect, useState } from "react";
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate";
import { ProductCard } from "../../organisms/ProductCard/ProductCard";
import { Spinner } from "../../atoms/Spinner/Spinner";
import type { Product } from "../../../types/Product";

export const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3000/products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        console.log("Fetched products:", data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <MainTemplate>
      <div>
        {loading ? (
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
          products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </div>
    </MainTemplate>
  );
};
