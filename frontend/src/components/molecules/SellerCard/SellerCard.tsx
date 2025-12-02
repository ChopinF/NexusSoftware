import { AlertCircle, BadgeCheck, MessageCircle, Tag } from "lucide-react";
import LocationAtom from "../../atoms/LocationAtom/LocationAtom.tsx";
import "./SellerCard.css";

const SellerCard = ({
  name,
  email,
  city,
  country,
  role,
  onDirectMessage,
  onMakeOffer,
}: {
  name: string;
  email: string;
  city: string;
  country: string;
  role: string;
  onDirectMessage?: () => void;
  onMakeOffer?: () => void;
}) => {
  const isTrusted = role.toLowerCase() === "trusted";

  return (
    <div className="seller-atom">
      <div className="seller-header">
        <h2 className="seller-title">Seller</h2>
        {isTrusted ? (
          <span title="Trusted seller">
            <BadgeCheck className="trusted-icon" size={18} />
          </span>
        ) : (
          <span title="Unverified seller">
            <AlertCircle className="not-trusted-icon" size={18} />
          </span>
        )}
      </div>
      <h3 className="seller-name">{name}</h3>
      <LocationAtom city={city} country={country} />
      <p className="seller-email">{email}</p>

      {onDirectMessage || onMakeOffer ? (
        <div className="action-grid">
          {onDirectMessage && (
            <button onClick={onDirectMessage} className="btn btn-primary">
              <MessageCircle size={16} />
              <span>Direct Message</span>
            </button>
          )}
          {onMakeOffer && (
            <button onClick={onMakeOffer} className="btn btn-secondary">
              <Tag size={16} />
              <span>Make Offer</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default SellerCard;
