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
import { Pencil, ShoppingCart, CheckCircle, Clock, AlertCircle, Trash2, Settings, Package } from "lucide-react";

interface NegotiationState {
  negotiationId: string;
  price: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ORDERED';
}

const ProductHeader: React.FC<{
  title: string;
  category: string;
  isFavorite: boolean;
  onFavoriteClick: () => void;
  isAuthenticated: boolean;
  isOwner: boolean;
}> = ({ title, category, isFavorite, onFavoriteClick, isAuthenticated }) => (
  <div className="product-header">
    <div className="header-top">
      <h1 className="product-title">{title}</h1>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
  hasStock: boolean;
}> = ({ description, price, onBuyClick, isOwner, negotiation, hasStock }) => {
  
  const isDealAccepted = negotiation?.status === 'ACCEPTED';
  const isDealPending = negotiation?.status === 'PENDING';

  return (
    <div className="product-details">
      <div className="price-action-row">
          <div className="price-wrapper">
            {isDealAccepted ? (
              <>
                <div className="price-tag deal-price">{negotiation!.price} RON</div>
                <div className="old-price-tag">{price} RON</div>
                <div className="deal-badge accepted"><CheckCircle size={14} /> Deal Accepted</div>
              </>
            ) : isDealPending ? (
              <>
                <div className="price-tag">{price} RON</div>
                <div className="deal-badge pending"><Clock size={14} /> Offer Pending: {negotiation!.price} RON</div>
              </>
            ) : (
              <div className="price-tag">{price} RON</div>
            )}
          </div>
          
          {!isOwner && (
            <button 
                className={`buy-now-btn ${!hasStock ? 'btn-disabled' : ''}`} 
                onClick={hasStock ? onBuyClick : undefined}
                disabled={!hasStock}
            >
              {hasStock ? (
                  <>
                    <ShoppingCart size={20} />
                    <span>{isDealAccepted ? `Buy for ${negotiation!.price} RON` : 'Buy Now'}</span>
                  </>
              ) : (
                  <>
                    <AlertCircle size={20} />
                    <span>Out of Stock</span>
                  </>
              )}
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
  const hasStock = (product.stock || 0) > 0;

  useEffect(() => {
    setIsFavorite(product.isFavorite ?? false);
  }, [product.isFavorite]);

  useEffect(() => {
    const fetchNegotiation = async () => {
      if (!user || !token) return;
      try {
        const res = await fetch(`${API_URL}/negotiation?productId=${product.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setNegotiation(data || null);
        }
      } catch (err) {
        console.error("Failed to fetch negotiation", err);
      }
    };
    fetchNegotiation();
  }, [product.id, user, token]);

  const handleEditClick = () => {
    navigate(`/product/${product.id}/edit`);
  };

  const handleDeleteClick = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete this product? This cannot be undone.");
    if (!confirmDelete) return;

    try {
        const res = await fetch(`${API_URL}/product/${product.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
            alert("Product deleted successfully.");
            window.dispatchEvent(new Event("products-updated-signal"));
            navigate('/my-products');
        } else {
            const data = await res.json();
            alert(data.error || "Error deleting product.");
        }
    } catch (err) {
        console.error(err);
        alert("Connection error.");
    }
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

  const handleMakeOfferClick = () => {
    if (isOwner) return;
    setIsOfferOpen(true);
  };

  const handleSubmitOffer = async (amount: string, quantity: number) => {
    console.log("Submitting offer:", amount, "Qty:", quantity);

    if (!user || !token) {
        alert("Te rugăm să te autentifici pentru a trimite o ofertă.");
        return;
    }

    const priceValue = parseFloat(amount);
    
    if (isNaN(priceValue) || priceValue <= 0) {
        alert("Preț invalid. Te rugăm să introduci un număr valid.");
        return;
    }

    try {
        const payload = {
            productId: product.id,
            offeredPrice: priceValue,
            quantity: quantity 
        };

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
            alert(`Ofertă de ${priceValue} RON (x${quantity} buc) trimisă cu succes!`);
            setIsOfferOpen(false);
            setNegotiation({
              negotiationId: data.id, 
              price: priceValue, 
              status: 'PENDING'
            });
        } else {
            alert(data.error || "Nu s-a putut trimite oferta.");
        }
    } catch (err) {
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
        />

        <ProductDetails
          description={product.description}
          price={product.price}
          onBuyClick={handleBuyClick}
          isOwner={isOwner || false}
          negotiation={negotiation}
          hasStock={hasStock}
        />

        <div className="seller-section-wrapper">
            {isOwner ? (
                <div className="owner-dashboard">
                    <div className="dashboard-header">
                        <Settings size={20} />
                        <h3>Product Management</h3>
                    </div>
                    
                    <div className="dashboard-stats">
                        <div className="stat-item">
                            <span className="stat-label">Status</span>
                            <span className={`stat-value ${hasStock ? 'text-green' : 'text-red'}`}>
                                {hasStock ? 'Active' : 'Out of Stock'}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Stock Level</span>
                            <span className="stat-value">
                                <Package size={16} /> {product.stock} units
                            </span>
                        </div>
                    </div>

                    <div className="dashboard-actions">
                        <button onClick={handleEditClick} className="dash-btn btn-edit">
                            <Pencil size={18} /> Edit Product
                        </button>
                        <button onClick={handleDeleteClick} className="dash-btn btn-delete">
                            <Trash2 size={18} /> Delete Product
                        </button>
                    </div>
                </div>
            ) : (
                <SellerCard
                    name={product.seller_name}
                    email={product.seller_email}
                    role={product.seller_role}
                    country={product.seller_country}
                    city={product.seller_city}
                    onDirectMessage={handleDirectMessage} 
                    onMakeOffer={hasStock ? handleMakeOfferClick : undefined}
                />
            )}
        </div>
        
        <OfferModal
          isOpen={isOfferOpen}
          onClose={() => setIsOfferOpen(false)}
          productTitle={product.title}
          actualPrice={product.price}
          onConfirm={handleSubmitOffer}
          maxStock={product.stock}
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