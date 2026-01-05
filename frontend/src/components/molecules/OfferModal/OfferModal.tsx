import { X } from "lucide-react";
import { useState, useEffect } from "react";
import "./OfferModal.css";

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: string) => void;
  productTitle: string;
  actualPrice: number;
}

const OfferModal: React.FC<OfferModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  productTitle,
  actualPrice,
}) => {
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPrice("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = parseFloat(price);

    if (!price || isNaN(parsed) || parsed <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    if (parsed >= actualPrice) {
      setError(`Offer must be lower than the current price (${actualPrice} RON).`);
      return;
    }

    onConfirm(parsed.toFixed(2));
  };

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

        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#9ca3af", fontSize: 13 }}>
            <span style={{ textDecoration: "line-through", marginRight: 8 }}>
              {actualPrice.toFixed(2)} RON
            </span>
            <span>(Current Price)</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
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

          <div style={{ marginBottom: 12, marginTop: 8, color: "#9ca3af", fontSize: 13 }}>
            Offered Amount:{" "}
            <strong style={{ color: "#fff" }}>
              {price && !isNaN(parseFloat(price)) ? parseFloat(price).toFixed(2) : "0.00"}
              <span style={{ marginLeft: 8 }}>RON</span>
            </strong>
          </div>

          {error && (
            <div style={{ color: "#f87171", marginBottom: 12, fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <div className="modal-actions">
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