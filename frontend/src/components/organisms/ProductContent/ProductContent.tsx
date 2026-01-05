import FavoriteButton from "../../atoms/FavoriteButton/FavoriteButton";
import CategoryBadge from "../../atoms/CategoryBadge/CategoryBadge";
import type { Product } from "../../../types/Product";
import { useState, useEffect } from "react";
import { useUser } from "../../../contexts/UserContext";
import SellerCard from "../../molecules/SellerCard/SellerCard";
import "./ProductContent.css";
import OfferModal from "../../molecules/OfferModal/OfferModal";
import ConversationModal from "../../molecules/ConversationModal/ConversationModal";
import { API_URL } from "../../../config";
import { useFavorite } from "../../../hooks/useFavorite";
import { useNavigate } from "react-router-dom"; 
import { Pencil, ShoppingCart, CheckCircle, Clock } from "lucide-react";

// Tip pentru negociere
interface NegotiationState {
  negotiationId: string;
  price: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ORDERED';
}

// --- Components ---

const ProductHeader: React.FC<{
  title: string;
  category: string;
  isFavorite: boolean;
  onFavoriteClick: () => void;
  isAuthenticated: boolean;
  isOwner: boolean;
  onEditClick: () => void;
}> = ({ title, category, isFavorite, onFavoriteClick, isAuthenticated, isOwner, onEditClick }) => (
  <div className="product-header">
    <div className="header-top">
      <h1 className="product-title">{title}</h1>
      
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {isOwner && (
          <button 
            onClick={onEditClick}
            title="Edit Product"
            className="icon-btn"
          >
            <Pencil size={24} />
          </button>
        )}

        {isAuthenticated && (
          <FavoriteButton isFavorite={isFavorite} onClick={onFavoriteClick} />
        )}
      </div>
    </div>
    <CategoryBadge category={category} />
  </div>
);

const ProductDetails: React.FC<{
  description: string;
  price: number;
  onBuyClick: () => void;
  isOwner: boolean;
  negotiation: NegotiationState | null;
}> = ({ description, price, onBuyClick, isOwner, negotiation }) => {
  
  // Logică de afișare a prețului
  const isDealAccepted = negotiation?.status === 'ACCEPTED';
  const isDealPending = negotiation?.status === 'PENDING';

  return (
    <div className="product-details">
      
      {/* Zona de Pret si Actiune */}
      <div className="price-action-row">
          
          {/* Afișare condiționată preț */}
          <div className="price-wrapper">
            {isDealAccepted ? (
              <>
                <div className="price-tag deal-price">{negotiation!.price} RON</div>
                <div className="old-price-tag">{price} RON</div>
                <div className="deal-badge accepted">
                  <CheckCircle size={14} /> Deal Accepted
                </div>
              </>
            ) : isDealPending ? (
              <>
                <div className="price-tag">{price} RON</div>
                <div className="deal-badge pending">
                  <Clock size={14} /> Offer Pending: {negotiation!.price} RON
                </div>
              </>
            ) : (
              <div className="price-tag">{price} RON</div>
            )}
          </div>
          
          {!isOwner && (
            <button className="buy-now-btn" onClick={onBuyClick}>
              <ShoppingCart size={20} />
              <span>
                {isDealAccepted ? `Buy for ${negotiation!.price} RON` : 'Buy Now'}
              </span>
            </button>
          )}
      </div>
  
      <p className="product-description">{description}</p>
    </div>
  );
};

const ProductContent: React.FC<{ 
  product: Product; 
  onToggleFavorite?: () => void; 
}> = ({ product, onToggleFavorite }) => { 
  
  const [isFavorite, setIsFavorite] = useState(product.isFavorite ?? false);
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [negotiation, setNegotiation] = useState<NegotiationState | null>(null);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [conversationId] = useState<string | null>(null);
  
  const { user, token } = useUser();
  const { toggleFavoriteApi } = useFavorite();
  const navigate = useNavigate();

  const imageUrl = product.imageUrl ? `${API_URL}${product.imageUrl}` : null;
  const isOwner = user && user.id === product.seller_id;
  const isAuthenticated = !!user;

  useEffect(() => {
    setIsFavorite(product.isFavorite ?? false);
  }, [product.isFavorite]);

  // Fetch Negotiation Status
  useEffect(() => {
    const fetchNegotiation = async () => {
      if (!user || !token) return;
      try {
        const res = await fetch(`${API_URL}/negotiation?productId=${product.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Backend-ul poate returna null dacă nu există negociere
          setNegotiation(data || null);
        }
      } catch (err) {
        console.error("Failed to fetch negotiation", err);
      }
    };
    fetchNegotiation();
  }, [product.id, user, token]);

  // --- Handlers ---

  const handleEditClick = () => {
    navigate(`/product/${product.id}/edit`);
  };

  const handleBuyClick = () => {
    if (negotiation && negotiation.status === 'ACCEPTED') {
      navigate(`/product/${product.id}/order?dealId=${negotiation.negotiationId}`);
    } else {
      navigate(`/product/${product.id}/order`);
    }
  };

  const handleFavoriteClick = async () => {
    if (!isAuthenticated) return;
    if (onToggleFavorite) {
        onToggleFavorite();
        return;
    }
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    const success = await toggleFavoriteApi(product.id, nextState);
    if (success) {
      window.dispatchEvent(new Event("products-updated-signal"));
    } else {
      setIsFavorite(!nextState);
      alert("Error updating favorites.");
    }
  };

  const handleDirectMessage = async () => {
    if (!user) return alert("Please login.");
    setIsChatOpen(true); 
  };

  // 1. Deschide Modalul
  const handleMakeOfferClick = () => {
    if (isOwner) {
        console.warn("Owner cannot make offer");
        return;
    }
    console.log("Opening offer modal...");
    setIsOfferOpen(true);
  };

  // 2. Trimite Oferta (Backend)
  const handleSubmitOffer = async (amount: string) => {
    console.log("Submitting offer:", amount); // Debug log

    if (!user || !token) {
        alert("Te rugăm să te autentifici pentru a trimite o ofertă.");
        return;
    }

    // Convertim input-ul în număr
    const priceValue = parseFloat(amount);
    
    // Verificăm dacă conversia a reușit
    if (isNaN(priceValue) || priceValue <= 0) {
        console.error("Invalid price value:", priceValue);
        alert("Preț invalid. Te rugăm să introduci un număr valid.");
        return;
    }

    try {
        const payload = {
            productId: product.id,
            offeredPrice: priceValue
        };
        console.log("Sending payload:", payload);

        const response = await fetch(`${API_URL}/negotiations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            alert(`Ofertă de ${priceValue} RON trimisă cu succes!`);
            setIsOfferOpen(false);
            
            // Actualizăm UI-ul instant
            setNegotiation({
              negotiationId: data.id, 
              price: priceValue, 
              status: 'PENDING'
            });
        } else {
            console.error("Offer error from server:", data);
            alert(data.error || "Nu s-a putut trimite oferta.");
        }
    } catch (err) {
        console.error("Network error submitting offer:", err);
        alert("Eroare de conexiune.");
    }
  };

  return (
    <div className="product-content">
      <div className="image-column">
        <div className="product-image">
          {imageUrl ? (
            <img src={imageUrl} alt={product.title} />
          ) : (
            <span className="no-image">No Image Available</span>
          )}
        </div>
      </div>

      <div className="details-column">
        <ProductHeader
          title={product.title}
          category={product.category}
          isFavorite={isFavorite}
          onFavoriteClick={handleFavoriteClick}
          isAuthenticated={isAuthenticated}
          isOwner={isOwner || false} 
          onEditClick={handleEditClick}
        />

        <ProductDetails
          description={product.description}
          price={product.price}
          onBuyClick={handleBuyClick}
          isOwner={isOwner || false}
          negotiation={negotiation}
        />

        <SellerCard
          name={product.seller_name}
          email={product.seller_email}
          role={product.seller_role}
          country={product.seller_country}
          city={product.seller_city}
          onDirectMessage={!isOwner ? handleDirectMessage : undefined} 
          // Aici se activează butonul doar dacă NU ești proprietar
          onMakeOffer={!isOwner ? handleMakeOfferClick : undefined}
        />

        <OfferModal
          isOpen={isOfferOpen}
          onClose={() => setIsOfferOpen(false)}
          productTitle={product.title}
          actualPrice={product.price}
          onConfirm={handleSubmitOffer}
        />

        {isChatOpen && conversationId && (
          <ConversationModal
            conversationId={conversationId}
            otherUserId={product.seller_id}
            otherUserName={product.seller_name}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default ProductContent;