import { X, Package } from "lucide-react"; // Am importat Package pentru iconita de cantitate
import { useState, useEffect } from "react";
import "./OfferModal.css";

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: string, quantity: number) => void;
  productTitle: string;
  actualPrice: number;
  maxStock: number;
}

const OfferModal: React.FC<OfferModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  productTitle,
  actualPrice,
  maxStock,
}) => {
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState<number>(1); // State nou pentru cantitate
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPrice("");
      setQuantity(1); // Resetam cantitatea la 1
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedPrice = parseFloat(price);

    // Validare Pret
    if (!price || isNaN(parsedPrice) || parsedPrice <= 0) {
      setError("Please enter a valid price greater than 0.");
      return;
    }

    if (parsedPrice >= actualPrice) {
      setError(`Offer price must be lower than current price (${actualPrice} RON).`);
      return;
    }

    // Validare Cantitate
    if (quantity < 1) {
        setError("Quantity must be at least 1.");
        return;
    }

    if (quantity > maxStock) {
        setError(`Only ${maxStock} items available in stock.`);
        return;
    }

    // Trimitem pretul unitar si cantitatea
    onConfirm(parsedPrice.toFixed(2), quantity);
  };

  const parsedPrice = parseFloat(price);
  const isValidPrice = !isNaN(parsedPrice);
  const totalOffer = isValidPrice ? (parsedPrice * quantity).toFixed(2) : "0.00";

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button 
          className="modal-close-btn" 
          onClick={onClose} 
          type="button"
        >
          <X size={20} />
        </button>

        <h3 className="modal-title">Make an Offer</h3>
        <p className="modal-description">
          Propose a price for <strong>{productTitle}</strong>.
        </p>

        <div style={{ marginBottom: 16 }}>
          <div style={{ color: "#9ca3af", fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
            <div>
                <span style={{ textDecoration: "line-through", marginRight: 8 }}>
                {actualPrice.toFixed(2)} RON
                </span>
                <span>(Unit Price)</span>
            </div>
            <div className={quantity > maxStock ? "text-red-500" : ""}>
                Available Stock: <strong style={{ color: quantity > maxStock ? "#f87171" : "#fff" }}>{maxStock}</strong>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* Container Flex pentru Input-uri */}
          <div className="inputs-row">
            {/* Input Pret */}
            <div className="input-group" style={{ flex: 2 }}>
                <label className="input-label">Unit Price</label>
                <div style={{ position: 'relative' }}>
                    <span className="input-currency-icon" style={{ paddingRight: 8 }}>
                    RON
                    </span>
                    <input
                    type="number"
                    className="modal-input"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => {
                        setPrice(e.target.value);
                        if (error) setError(null);
                    }}
                    autoFocus
                    min="0.01"
                    step="0.01"
                    />
                </div>
            </div>

            {/* Input Cantitate */}
            <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Quantity</label>
                <div style={{ position: 'relative' }}>
                    <span className="input-currency-icon">
                        <Package size={16} />
                    </span>
                    <input
                    type="number"
                    className="modal-input"
                    placeholder="1"
                    value={quantity}
                    onChange={(e) => {
                        setQuantity(parseInt(e.target.value) || 0);
                        if (error) setError(null);
                    }}
                    min="1"
                    max={maxStock}
                    step="1"
                    />
                </div>
            </div>
          </div>

          {/* Sumar Total */}
          <div className="offer-summary">
            <div className="summary-row">
                <span>Unit Price:</span>
                <span>{isValidPrice ? parsedPrice.toFixed(2) : "0.00"} RON</span>
            </div>
            <div className="summary-row">
                <span>Quantity:</span>
                <span>x {quantity}</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-row total">
                <span>Total Offer:</span>
                <strong style={{ color: "#4ade80", fontSize: '1.1rem' }}>
                    {totalOffer} RON
                </strong>
            </div>
          </div>

          {error && (
            <div style={{ color: "#f87171", marginBottom: 12, fontSize: '0.9rem', marginTop: 12 }}>
              {error}
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-confirm"
            >
              Submit Offer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OfferModal;