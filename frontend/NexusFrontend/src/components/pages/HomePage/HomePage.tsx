import React, { useEffect, useState } from "react";
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate";
import { ProductCard } from "../../organisms/ProductCard/ProductCard";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  sellerEmail: string;
}

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
          <p>Loading...</p>
        ) : (
          products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </div>
    </MainTemplate>
  );
};
