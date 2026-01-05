import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useUser } from "../../../contexts/UserContext";

import { Textarea } from "../../atoms/Textarea/Textarea";
import { Button } from "../../atoms/Button/Button";
import { Spinner } from "../../atoms/Spinner/Spinner";
import { FormField } from "../../molecules/FormField/FormField";
import { AlertMessage } from "../../molecules/AlertMessage/AlertMessage";
import styles from "./OrderProductForm.module.css";
import { API_URL } from "../../../config";
import type { Product } from "../../../types/Product";

export const OrderProductForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const negotiationId = searchParams.get('dealId');

  const { token, user } = useUser();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [shippingAddress, setShippingAddress] = useState("");
  
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [isNegotiated, setIsNegotiated] = useState(false);

  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const res = await fetch(`${API_URL}/product/${id}`);
        if (!res.ok) throw new Error("Failed to load product details.");
        const productData = await res.json();
        
        let priceToDisplay = productData.price;
        let negotiatedStatus = false;

        if (negotiationId && token) {
            const negRes = await fetch(`${API_URL}/negotiation?productId=${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (negRes.ok) {
                const negData = await negRes.json();
                if (negData && negData.negotiationId === negotiationId && negData.status === 'ACCEPTED') {
                    priceToDisplay = negData.price;
                    negotiatedStatus = true;
                }
            }
        }

        setProduct(productData);
        setFinalPrice(priceToDisplay);
        setIsNegotiated(negotiatedStatus);

      } catch (err) {
        setError("Could not load product. It might have been removed.");
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, [id, negotiationId, token]);

  if (!user) {
    return (
      <div className={styles.formContainer}>
        <AlertMessage type="error" message="You must be logged in to place an order." />
        <div className={styles.buttonWrapper}>
             <Button onClick={() => navigate("/login")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!product || !id) {
        setError("Invalid product.");
        return;
    }

    if (!shippingAddress.trim() || shippingAddress.length < 5) {
      setError("Please provide a valid shipping address (min 5 chars).");
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        productId: product.id,
        shipping_address: shippingAddress,
        negotiationId: negotiationId || null 
      };

      const res = await fetch(`${API_URL}/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to place order.");
      }

      alert("Order placed successfully!");
      navigate("/profile"); 

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetching) {
    return (
        <div className={styles.formContainer} style={{ textAlign: 'center' }}>
            <Spinner size="lg" />
        </div>
    );
  }

  if (!product) {
      return (
        <div className={styles.formContainer}>
            <AlertMessage type="error" message="Product not found." />
            <Button onClick={() => navigate("/")} variant="secondary">Back to Home</Button>
        </div>
      );
  }

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.formTitle}>Complete Order</h2>

      {error && (
        <AlertMessage
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        
        {/* Product Summary */}
        <div className={styles.productSummary}>
            <div style={{ marginBottom: '1rem' }}>
                <span className={styles.summaryLabel}>Product</span>
                <span className={styles.summaryValue}>{product.title}</span>
            </div>
            <div>
                <span className={styles.summaryLabel}>Total Price</span>
                
                {/* 3. Afișare condiționată Preț */}
                {isNegotiated ? (
                    <div className={styles.priceContainer}>
                        <span className={styles.oldPrice}>
                            {product.price} RON
                        </span>
                        <span className={`${styles.summaryValue} ${styles.priceValue}`}>
                            {finalPrice} RON
                        </span>
                    </div>
                ) : (
                    <span className={`${styles.summaryValue} ${styles.priceValue}`}>
                        {product.price} RON
                    </span>
                )}
            </div>
        </div>

        {/* Shipping Address */}
        <FormField label="Shipping Address" htmlFor="shipping-address">
          <Textarea
            id="shipping-address"
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            disabled={isSubmitting}
            placeholder="Street, Number, City, County, Zip Code..."
            rows={4}
            required
          />
        </FormField>

        {/* Submit Button */}
        <div className={styles.buttonWrapper}>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? <Spinner size="sm" /> : `Pay ${finalPrice} RON`}
          </Button>
        </div>
        
        {/* Cancel Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={isSubmitting}>
                Cancel
            </Button>
        </div>

      </form>
    </div>
  );
};