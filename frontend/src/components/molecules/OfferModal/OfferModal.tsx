import { X } from "lucide-react";
import { useState } from "react";

import "./OfferModal.css";

const OfferModal = ({
  isOpen,
  onClose,
  onConfirm,
  productTitle,
  actualPrice,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: string) => void;
  productTitle: string;
  actualPrice: number;
}) => {
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const parsed = parseFloat((price as unknown as string) || "0");
  const isValid = !isNaN(parsed) && parsed > 0 && parsed < actualPrice;

  const handleConfirm = () => {
    setError(null);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Prețul trebuie să fie mai mare decât 0.");
      return;
    }
    if (parsed >= actualPrice) {
      setError("Prețul oferit trebuie să fie mai mic decât prețul produsului.");
      return;
    }
    onConfirm(parsed.toFixed(2));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <h3 className="modal-title">Fă o ofertă</h3>
        <p className="modal-description">
          Trimite o ofertă pentru produsul selectat.
        </p>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, color: "#9ca3af", marginBottom: 6 }}>
            Produs
          </div>
          <div style={{ fontWeight: 600, color: "#fff", marginBottom: 6 }}>
            {productTitle}
          </div>
          <div style={{ color: "#9ca3af", fontSize: 13 }}>
            <span style={{ textDecoration: "line-through", marginRight: 8 }}>
              <span>{actualPrice.toFixed(2)}</span>
              <span style={{ marginLeft: 8 }}>RON</span>
            </span>
            <span style={{ marginLeft: 8 }}>Preț actual</span>
          </div>
        </div>

        <div className="input-group">
          <span className="input-currency-icon" style={{ paddingRight: 8 }}>
            RON
          </span>
          <input
            type="number"
            className="modal-input"
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            autoFocus
            min="0.01"
            step="0.01"
            aria-label="Suma oferită în RON"
          />
        </div>

        <div style={{ marginBottom: 12, color: "#9ca3af", fontSize: 13 }}>
          Suma oferită:{" "}
          <strong style={{ color: "#fff" }}>
            {price ? parseFloat(price).toFixed(2) : "0.00"}
            <span style={{ marginLeft: 8 }}>RON</span>
          </strong>
        </div>

        {error && (
          <div style={{ color: "#f87171", marginBottom: 12 }}>{error}</div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Anulează
          </button>
          <button
            className="btn btn-confirm"
            onClick={handleConfirm}
            disabled={!isValid}
            title={isValid ? "" : "Preț invalid"}
          >
            Trimite ofertă
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfferModal;
