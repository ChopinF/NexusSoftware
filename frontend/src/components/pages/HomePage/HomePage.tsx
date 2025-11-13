import React, { useEffect, useState, useCallback } from "react"; // 1. Importă useCallback
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate";
import { ProductCard } from "../../organisms/ProductCard/ProductCard";
import { Spinner } from "../../atoms/Spinner/Spinner";
import type { Product } from "../../../types/Product";
import { useCategory } from "../../../contexts/CategoryContext";

export const HomePage: React.FC = () => {
  const { selectedCategory, searchQuery } = useCategory();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (selectedCategory) params.append("category", selectedCategory);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`http://localhost:3000/products?${params.toString()}`);
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const handleStorageUpdate = (event: StorageEvent) => {
      if (event.key === "products-updated-signal") {
        console.log("Primit semnal de actualizare... se reîncarcă produsele.");
        fetchProducts();
      }
    };

    window.addEventListener("storage", handleStorageUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, [fetchProducts]);

  return (
    <MainTemplate>
      {loading ? (
        <div className="flex justify-center items-center min-h-[40vh]">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 p-4">
          {products.length > 0 ? (
            products.map((product) => <ProductCard key={product.id} product={product} />)
          ) : (
            <p className="text-center text-gray-400 col-span-3">No products found.</p>
          )}
        </div>
      )}
    </MainTemplate>
  );
};