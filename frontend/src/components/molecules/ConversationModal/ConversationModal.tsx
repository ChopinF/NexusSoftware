import { useEffect, useState } from "react";
import ChatView from "../ChatView/ChatView";
import { useUser } from "../../../contexts/UserContext";
import "../OfferModal/OfferModal.css";

const API_BASE = "http://localhost:3000";

const ConversationModal = ({
  conversationId,
  otherUserId,
  otherUserName,
  onClose,
  initialOffer,
}: {
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
  onClose: () => void;
  initialOffer?: string;
}) => {
  const { user, token } = useUser();
  const userId = user?.id;
  const [messages, setMessages] = useState<any[]>([]);
  const [displayName, setDisplayName] = useState(otherUserName);

  useEffect(() => {
    if (!conversationId || !userId) return;
    const fetchMessages = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/conversations/${conversationId}/user/${userId}`,
          { headers: { Authorization: token ? `Bearer ${token}` : "" } }
        );
        if (!res.ok) throw new Error("Failed to fetch messages");
        const data = await res.json();
        console.log("Fetched messages:", data);
        console.log("Current user ID:", userId, "Type:", typeof userId);
        console.log("Provided otherUserName:", otherUserName);

        // Extract the other person's name from the message data
        if (data && data.length > 0) {
          const firstMsg = data[0];
          console.log("First message:", firstMsg);
          console.log(
            "seller_id:",
            firstMsg.seller_id,
            "buyer_id:",
            firstMsg.buyer_id
          );
          console.log(
            "seller_name:",
            firstMsg.seller_name,
            "buyer_name:",
            firstMsg.buyer_name
          );

          // Determine if current user is seller or buyer
          const isSeller = String(userId) === String(firstMsg.seller_id);
          console.log("Is current user the seller?", isSeller);

          const extractedName = isSeller
            ? firstMsg.buyer_name
            : firstMsg.seller_name;
          console.log("Extracted name:", extractedName);

          // Use extracted name if available, otherwise keep the provided name or use fallback
          if (extractedName) {
            setDisplayName(extractedName);
          } else if (!otherUserName || otherUserName.includes("Unknown")) {
            // Fallback to generic labels
            setDisplayName(isSeller ? "Buyer" : "Seller");
          }

          // Mark unread messages from the other user as read
          const unreadMessages = data.filter(
            (msg: any) =>
              String(msg.from_user) !== String(userId) && msg.is_read === 0
          );

          for (const msg of unreadMessages) {
            try {
              await fetch(
                `${API_BASE}/conversations/${conversationId}/messages/${msg.id}`,
                {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: token ? `Bearer ${token}` : "",
                  },
                  body: JSON.stringify({ is_read: 1 }),
                }
              );
            } catch (err) {
              console.error("Failed to mark message as read:", err);
            }
          }
        }

        // If there's an initialOffer (coming from the Offer flow), append a local offer message
        let msgs = data || [];
        if (initialOffer) {
          const offerMsg = {
            id: `local-offer-${Date.now()}`,
            conversation_id: conversationId,
            message: `I would like to offer $${initialOffer} for this item.`,
            created_at: new Date().toISOString(),
            is_read: 0,
            from_user: userId,
            to_user: otherUserId,
          };
          msgs = [...msgs, offerMsg];
        }
        setMessages(msgs);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMessages();
  }, [conversationId, userId, token]);

  const handleSend = async (text: string) => {
    if (!conversationId || !userId) return;
    const payload = {
      message: text,
      from_user: userId,
      to_user: otherUserId,
      created_at: new Date().toISOString(),
      is_read: 0,
    };
    try {
      const res = await fetch(
        `${API_BASE}/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Failed to send message");
      const newMessage = await res.json();
      setMessages((prev) => [...prev, newMessage]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-box-wide">
        <button className="modal-close-btn" onClick={onClose}>
          ✕
        </button>
        <ChatView
          sellerName={displayName}
          initialOffer={initialOffer}
          remoteMessages={messages.map((m) => {
            // Ensure both values are strings for comparison
            const fromUserId = String(m.from_user);
            const currentUserId = String(user?.id);
            console.log(
              "Message:",
              m.message?.substring(0, 30),
              "from_user:",
              m.from_user,
              "(type:",
              typeof m.from_user,
              ") vs current user:",
              user?.id,
              "(type:",
              typeof user?.id,
              ")"
            );
            console.log(
              "Comparison:",
              fromUserId,
              "===",
              currentUserId,
              "=>",
              fromUserId === currentUserId
            );
            return {
              id: Date.now() + Math.random(),
              text: m.message || "",
              type:
                fromUserId === currentUserId
                  ? ("sent" as const)
                  : ("received" as const),
            };
          })}
          onSend={handleSend}
        />
      </div>
    </div>
  );
};

export default ConversationModal;
