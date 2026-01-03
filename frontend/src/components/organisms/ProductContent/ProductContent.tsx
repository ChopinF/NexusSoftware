import FavoriteButton from "../../atoms/FavoriteButton/FavoriteButton.tsx";
import CategoryBadge from "../../atoms/CategoryBadge/CategoryBadge.tsx";
import type { Product } from "../../../types/Product.ts";
import { useState, useEffect } from "react";
import { useUser } from "../../../contexts/UserContext";
import SellerCard from "../../molecules/SellerCard/SellerCard.tsx";
import "./ProductContent.css";
import OfferModal from "../../molecules/OfferModal/OfferModal";
import ConversationModal from "../../molecules/ConversationModal/ConversationModal";
import { API_URL } from "../../../config";
import { useFavorite } from "../../../hooks/useFavorite";
// 1. Importăm useNavigate și iconița Pencil
import { useNavigate } from "react-router-dom"; 
import { Pencil } from "lucide-react";

const ProductHeader: React.FC<{
  title: string;
  category: string;
  isFavorite: boolean;
  onFavoriteClick: () => void;
  isAuthenticated: boolean;
  // 2. Adăugăm props pentru editare
  isOwner: boolean;
  onEditClick: () => void;
}> = ({ title, category, isFavorite, onFavoriteClick, isAuthenticated, isOwner, onEditClick }) => (
  <div className="product-header">
    <div className="header-top">
      <h1 className="product-title">{title}</h1>
      
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {/* 3. Butonul de editare (Pencil) */}
        {isOwner && (
          <button 
            onClick={onEditClick}
            title="Edit Product"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              borderRadius: '50%',
              color: '#6b7280', 
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
}> = ({ description, price }) => (
  <div className="product-details">
    <div className="price-tag">{price} RON</div>
    <p className="product-description">{description}</p>
  </div>
);

const ProductContent: React.FC<{ 
  product: Product; 
  onToggleFavorite?: () => void; 
}> = ({ product, onToggleFavorite }) => { 
  
  const [isFavorite, setIsFavorite] = useState(product.isFavorite ?? false);
  
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialOffer, setChatInitialOffer] = useState<string | undefined>(
    undefined
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { user, token } = useUser();
  const { toggleFavoriteApi } = useFavorite();
  
  // 4. Hook pentru navigare
  const navigate = useNavigate();

  useEffect(() => {
    setIsFavorite(product.isFavorite ?? false);
  }, [product.isFavorite]);

  const imageUrl = product.imageUrl ? `${API_URL}${product.imageUrl}` : null;
  const isOwner = user && user.id === product.seller_id;
  const isAuthenticated = !!user;

  // 5. Funcția de navigare către pagina de editare
  const handleEditClick = () => {
    navigate(`/edit-product/${product.id}`);
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
      alert("A apărut o eroare la actualizarea favoritelor.");
    }
  };

  const handleDirectMessage = async () => {
    console.log("DM click: product", product.id, "seller", product.seller_id);
    try {
      if (!user) {
        alert("Please login to message sellers.");
        return;
      }

      const findRes = await fetch(`${API_URL}/conversations/user/${user.id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });

      let foundId: string | null = null;
      if (findRes.ok) {
        const rows = await findRes.json();
        const row = rows.find(
          (r: any) =>
            r.seller_id === product.seller_id ||
            r.buyer_id === product.seller_id
        );
        if (row) foundId = row.conversation_id;
      } else {
        console.warn(
          "DM: could not fetch conversations for user",
          user.id,
          findRes.status
        );
      }

      if (!foundId) {
        const createRes = await fetch(`${API_URL}/conversations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            buyer_id: user.id,
            seller_id: product.seller_id,
          }),
        });
        if (createRes.ok) {
          const data = await createRes.json();
          foundId = data.id;
        } else {
          const text = await createRes.text();
          console.error(
            "DM: create conversation failed",
            createRes.status,
            text
          );
          alert("Could not create conversation (server error)");
        }
      }

      if (foundId) {
        setConversationId(foundId);
        setChatInitialOffer(undefined);
        setIsChatOpen(true);
      } else {
        console.warn("DM: no conversation id found/created");
      }
    } catch (err) {
      console.error("DM error", err);
      alert(
        "An error occurred while opening the conversation. See console for details."
      );
    }
  };

  const handleMakeOfferClick = async () => {
    console.log("Make Offer click");
    if (user && user.id === product.seller_id) {
      console.warn(
        "User attempted to make an offer on their own product; ignoring."
      );
      return;
    }
    setIsOfferOpen(true);
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
          // 6. Trimitem props-urile noi
          isOwner={isOwner || false} 
          onEditClick={handleEditClick}
        />

        <ProductDetails
          description={product.description}
          price={product.price}
        />

        <SellerCard
          name={product.seller_name}
          email={product.seller_email}
          role={product.seller_role}
          country={product.seller_country}
          city={product.seller_city}
          onDirectMessage={!isOwner ? handleDirectMessage : undefined}
          onMakeOffer={!isOwner ? handleMakeOfferClick : undefined}
        />

        <OfferModal
          isOpen={isOfferOpen}
          onClose={() => setIsOfferOpen(false)}
          productTitle={product.title}
          actualPrice={product.price}
          onConfirm={async (amount: string) => {
            setIsOfferOpen(false);
            if (!user)
              return alert(
                "Te rugăm să te autentifici pentru a trimite o ofertă."
              );
            let foundId: string | null = null;
            const findRes = await fetch(
              `${API_URL}/conversations/user/${user.id}`,
              {
                headers: { Authorization: token ? `Bearer ${token}` : "" },
              }
            );
            if (findRes.ok) {
              const rows = await findRes.json();
              const row = rows.find(
                (r: any) =>
                  r.seller_id === product.seller_id ||
                  r.buyer_id === product.seller_id
              );
              if (row) foundId = row.conversation_id;
            }
            if (!foundId) {
              const createRes = await fetch(`${API_URL}/conversations`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: token ? `Bearer ${token}` : "",
                },
                body: JSON.stringify({
                  buyer_id: user.id,
                  seller_id: product.seller_id,
                }),
              });
              if (createRes.ok) {
                const data = await createRes.json();
                foundId = data.id;
              } else {
                const text = await createRes.text();
                console.error(
                  "Create conversation failed:",
                  createRes.status,
                  text
                );
                alert("Could not create conversation (server error)");
                return;
              }
            }

            try {
              const offerPayload = {
                message: `Doresc să ofer ${amount} RON pentru produsul "${
                  product.title
                }" (preț actual: ${product.price.toFixed(2)} RON).`,
                from_user: user.id,
                to_user: product.seller_id,
                created_at: new Date().toISOString(),
                is_read: 0,
              };
              const postRes = await fetch(
                `${API_URL}/conversations/${foundId}/messages`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: token ? `Bearer ${token}` : "",
                  },
                  body: JSON.stringify(offerPayload),
                }
              );
              if (!postRes.ok) {
                const text = await postRes.text();
                console.error(
                  "Failed to post offer message:",
                  postRes.status,
                  text
                );
                alert("Offer was not sent to server. See console for details.");
              }
            } catch (err) {
              console.error("Error posting offer message:", err);
              alert("Offer failed to send. See console for details.");
            }

            setConversationId(foundId);
            setChatInitialOffer(undefined);
            setIsChatOpen(true);
          }}
        />

        {isChatOpen && conversationId && (
          <ConversationModal
            conversationId={conversationId}
            otherUserId={product.seller_id}
            otherUserName={product.seller_name}
            onClose={() => setIsChatOpen(false)}
            initialOffer={chatInitialOffer}
          />
        )}
      </div>
    </div>
  );
};

export default ProductContent;