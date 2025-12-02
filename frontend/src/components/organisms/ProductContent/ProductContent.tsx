import FavoriteButton from "../../atoms/FavoriteButton/FavoriteButton.tsx";
import CategoryBadge from "../../atoms/CategoryBadge/CategoryBadge.tsx";
import type { Product } from "../../../types/Product.ts";
import { useState } from "react";
import { useUser } from "../../../contexts/UserContext";
import SellerCard from "../../molecules/SellerCard/SellerCard.tsx";
import "./ProductContent.css";
import OfferModal from "../../molecules/OfferModal/OfferModal";
import ConversationModal from "../../molecules/ConversationModal/ConversationModal";

const API_URL = "http://localhost:3000";

const ProductHeader: React.FC<{
  title: string;
  category: string;
  isFavorite: boolean;
  onFavoriteClick: () => void;
}> = ({ title, category, isFavorite, onFavoriteClick }) => (
  <div className="product-header">
    <div className="header-top">
      <h1 className="product-title">{title}</h1>
      <FavoriteButton isFavorite={isFavorite} onClick={onFavoriteClick} />
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

const ProductContent: React.FC<{ product: Product }> = ({ product }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialOffer, setChatInitialOffer] = useState<string | undefined>(
    undefined
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { user, token } = useUser();

  const imageUrl = product.imageUrl ? `${API_URL}${product.imageUrl}` : null;

  const isOwner = user && user.id === product.seller_id;

  const handleDirectMessage = async () => {
    console.log("DM click: product", product.id, "seller", product.seller_id);
    try {
      if (!user) {
        alert("Please login to message sellers.");
        return;
      }

      // find existing conversation or create one
      const findRes = await fetch(`${API_URL}/conversations/user/${user.id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });

      let foundId: string | null = null;
      if (findRes.ok) {
        const rows = await findRes.json();
        console.log("DM: conversations rows:", rows);
        // rows may contain many messages; find conversation with this seller
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
          console.log("DM: created conversation", foundId);
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
          onFavoriteClick={() => setIsFavorite(!isFavorite)}
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

        {/* Offer modal */}
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
            // ensure conversation exists
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

            // Post the offer as a message to the conversation so it is persisted
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

            // open chat (server now contains the offer message)
            setConversationId(foundId);
            setChatInitialOffer(undefined);
            setIsChatOpen(true);
          }}
        />

        {/* Conversation modal (chat backed by server) */}
        {isChatOpen && conversationId && (
          <ConversationModal
            conversationId={conversationId}
            sellerId={product.seller_id}
            sellerName={product.seller_name}
            onClose={() => setIsChatOpen(false)}
            initialOffer={chatInitialOffer}
          />
        )}
      </div>
    </div>
  );
};

export default ProductContent;
