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

// Importam Input pentru a permite editarea cantitatii
import { Input } from "../../atoms/Input/Input"; 

export const OrderProductForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const negotiationId = searchParams.get('dealId');

  const { token, user } = useUser();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [shippingAddress, setShippingAddress] = useState("");
  
  const [pricePerUnit, setPricePerUnit] = useState<number>(0);
  // 1. State pentru cantitate
  const [quantity, setQuantity] = useState<number>(1);
  const [isNegotiated, setIsNegotiated] = useState(false);

  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        // Fetch Product
        const res = await fetch(`${API_URL}/product/${id}`);
        if (!res.ok) throw new Error("Failed to load product details.");
        const productData = await res.json();
        
        let currentPrice = productData.price;
        let currentQty = 1;
        let negotiatedStatus = false;

        // Fetch Negotiation (if exists)
        if (negotiationId && token) {
            const negRes = await fetch(`${API_URL}/negotiation?negotiationId=${negotiationId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (negRes.ok) {
                const negData = await negRes.json();
                // Verificam daca negocierea e valida si apartine acestui produs
                if (negData && negData.status === 'ACCEPTED') {
                    currentPrice = negData.price;
                    currentQty = negData.quantity || 1; // Preluam cantitatea negociata
                    negotiatedStatus = true;
                }
            }
        }

        setProduct(productData);
        setPricePerUnit(currentPrice);
        setQuantity(currentQty);
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

    // Validare stoc
    const maxStock = product.stock || 0;
    if (quantity > maxStock) {
        setError(`Only ${maxStock} items available in stock.`);
        return;
    }

    setIsSubmitting(true);

    try {
      // 2. Trimitem quantity la backend
      const orderPayload = {
        productId: product.id,
        shipping_address: shippingAddress,
        negotiationId: negotiationId || null,
        quantity: quantity 
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
      // Trimitem semnal ca produsele s-au updatat (stocul a scazut)
      window.dispatchEvent(new Event("products-updated-signal"));
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

  // 3. Calculam pretul total pentru afisare
  const totalDisplayPrice = (pricePerUnit * quantity).toFixed(2);

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
            <div style={{ marginBottom: '0.5rem' }}>
                <span className={styles.summaryLabel}>Product</span>
                <span className={styles.summaryValue}>{product.title}</span>
            </div>

            {/* Price Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className={styles.summaryLabel}>Unit Price</span>
                {isNegotiated ? (
                   <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className={styles.oldPrice}>{product.price} RON</span>
                        <span className={styles.summaryValue}>{pricePerUnit} RON</span>
                   </div>
                ) : (
                    <span className={styles.summaryValue}>{pricePerUnit} RON</span>
                )}
            </div>
            
            {/* Quantity Input */}
            <div style={{ marginBottom: '1rem' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span className={styles.summaryLabel}>Quantity</span>
                    <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Max: {product.stock}</span>
                 </div>
                 
                 <Input 
                    type="number"
                    min="1"
                    max={product.stock}
                    value={quantity.toString()}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    disabled={isNegotiated || isSubmitting}
                    style={{ textAlign: 'right', fontWeight: 'bold' }}
                 />
                 {isNegotiated && (
                    <div style={{ fontSize: '0.75rem', color: '#FBBF24', marginTop: '4px', textAlign: 'right' }}>
                        Quantity fixed by deal
                    </div>
                 )}
            </div>

            <div style={{ borderTop: '1px solid #374151', paddingTop: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                <span className={styles.summaryLabel} style={{ fontSize: '1.1rem' }}>Total</span>
                <span className={styles.summaryValue} style={{ fontSize: '1.25rem', color: '#4ADE80' }}>
                    {totalDisplayPrice} RON
                </span>
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
            {isSubmitting ? <Spinner size="sm" /> : `Pay ${totalDisplayPrice} RON`}
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