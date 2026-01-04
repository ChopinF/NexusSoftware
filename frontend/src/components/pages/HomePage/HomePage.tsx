import React, { useEffect, useState, useCallback, useRef } from "react";
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate";
import { ProductCard } from "../../organisms/ProductCard/ProductCard";
import { Spinner } from "../../atoms/Spinner/Spinner";
import type { Product } from "../../../types/Product";
import { useCategory } from "../../../contexts/CategoryContext";
import { API_URL } from "../../../config";
import { ChevronDown, ListFilter } from "lucide-react";
import "./HomePage.css";

export const HomePage: React.FC = () => {
  const { selectedCategory, searchQuery } = useCategory();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState("title");
  const [order, setOrder] = useState("ASC");
  
  const [isSortOpen, setIsSortOpen] = useState(false);
  
  const loaderRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const isFetching = useRef(false); 
  const ITEMS_PER_PAGE = 6;

  const sortOptions = [
    { label: "Name (A-Z)", value: "title-ASC" },
    { label: "Name (Z-A)", value: "title-DESC" },
    { label: "Price (Low to High)", value: "price-ASC" },
    { label: "Price (High to Low)", value: "price-DESC" },
    { label: "Most Popular", value: "favorites_count-DESC" },
  ];

  const fetchProducts = useCallback(async (isInitial = false) => {
    if (isFetching.current || (!hasMore && !isInitial)) return;

    try {
      isFetching.current = true;
      setLoading(true);
      
      const pageToFetch = isInitial ? 1 : page;
      
      const params = new URLSearchParams();
      if (selectedCategory) params.append("category", selectedCategory);
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", pageToFetch.toString());
      params.append("limit", ITEMS_PER_PAGE.toString());
      params.append("sortBy", sortBy);
      params.append("order", order);

      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/products?${params.toString()}`, {
        method: "GET",
        headers: headers
      });
      
      const data = await res.json();
      const newProducts = data.products || [];

      if (isInitial) {
        setProducts(newProducts);
        setPage(2);
      } else {
        setProducts(prev => [...prev, ...newProducts]);
        setPage(prev => prev + 1);
      }

      setHasMore(newProducts.length === ITEMS_PER_PAGE);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [selectedCategory, searchQuery, sortBy, order, hasMore, page]); 

  useEffect(() => {
    setHasMore(true);
    fetchProducts(true);
  }, [selectedCategory, searchQuery, sortBy, order]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching.current) {
          fetchProducts(false);
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [fetchProducts, hasMore]);

  const currentSortLabel = sortOptions.find(opt => opt.value === `${sortBy}-${order}`)?.label;

  const pageTitle = searchQuery 
    ? `Search results for "${searchQuery}"` 
    : selectedCategory 
      ? `${selectedCategory} Products` 
      : "Discover Latest Products";

  return (
    <MainTemplate>
      <div className="home-container">
        <div className="home-header">
            <h1>{pageTitle}</h1>
            
            <div className="sort-wrapper" ref={sortRef}>
              <button 
                className="sort-button" 
                onClick={() => setIsSortOpen(!isSortOpen)}
              >
                <ListFilter size={18} />
                <span>Sort by: <strong>{currentSortLabel}</strong></span>
                <ChevronDown size={16} className={isSortOpen ? "rotate" : ""} />
              </button>

              {isSortOpen && (
                <div className="sort-dropdown">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`sort-option ${`${sortBy}-${order}` === option.value ? "active" : ""}`}
                      onClick={() => {
                        const [newSort, newOrder] = option.value.split("-");
                        setSortBy(newSort);
                        setOrder(newOrder);
                        setIsSortOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
        </div>

        <div className="products-grid">
          {products.map((product, index) => (
            <ProductCard key={`${product.id}-${index}`} product={product}/>
          ))}
          {products.length === 0 && !loading && (
            <div className="no-products">
              <h3>No products found</h3>
              <p>Try adjusting your search or category filters.</p>
            </div>
          )}
        </div>

        <div ref={loaderRef} className="loading-trigger">
          {loading && <Spinner size="lg" />}
          {!hasMore && products.length > 0 && (
            <p className="end-message">You've reached the end of the catalog.</p>
          )}
        </div>
      </div>
    </MainTemplate>
  );
};