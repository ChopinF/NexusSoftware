import React, { useEffect, useState } from "react";
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate";
import { API_URL } from "../../../config";
import styles from "./MyProductsPage.module.css";
import { useNavigate } from "react-router-dom";
import { Package, Plus } from "lucide-react";
import { Spinner } from "../../atoms/Spinner/Spinner";
import type { Product } from "../../../types/Product";
import { ProductCard } from "../../organisms/ProductCard/ProductCard";

export const MyProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyProducts = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await fetch(`${API_URL}/my-products`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyProducts();
  }, [navigate]);

  return (
    <MainTemplate>
      <div className={styles.container}>
        
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h1>My Products</h1>
            {products.length > 0 && (
              <span className={styles.badgeCount}>{products.length}</span>
            )}
          </div>
          
          <button 
            className={styles.actionHeaderBtn}
            onClick={() => navigate("/post-ad")}
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Product</span>
          </button>
        </div>

        {loading ? (
          <div className={styles.loader}>
            <Spinner size="lg" />
          </div>
        ) : (
          <div className={styles.grid}>
            {products.length > 0 ? (
              products.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                />
              ))
            ) : (
              <div className={styles.emptyState}>
                <Package size={48} style={{ opacity: 0.5 }} />
                <h3>No products listed</h3>
                <p>You haven't listed any items for sale yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </MainTemplate>
  );
};