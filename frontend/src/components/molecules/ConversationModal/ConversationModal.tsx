import { useEffect, useState } from "react";
import ChatView from "../ChatView/ChatView";
import { useUser } from "../../../contexts/UserContext";

const API_BASE = "http://localhost:3000";

const ConversationModal = ({
  conversationId,
  sellerId,
  sellerName,
  onClose,
  initialOffer,
}: {
  conversationId: string;
  sellerId: string;
  sellerName: string;
  onClose: () => void;
  initialOffer?: string;
}) => {
  const { user, token } = useUser();
  const userId = user?.id;
  const [messages, setMessages] = useState<any[]>([]);

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
            to_user: sellerId,
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
      to_user: sellerId,
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
      <div className="modal-box">
        <button className="modal-close-btn" onClick={onClose}>
          ✕
        </button>
        <ChatView
          sellerName={sellerName}
          initialOffer={initialOffer}
          onBack={onClose}
          remoteMessages={messages.map((m) => ({
            id: Date.now() + Math.random(),
            text: m.message || "",
            type: (m.is_read !== undefined
              ? m.from_user === user?.id
                ? ("sent" as const)
                : ("received" as const)
              : ("received" as const)) as "sent" | "received" | "offer",
          }))}
          onSend={handleSend}
        />
      </div>
    </div>
  );
};

export default ConversationModal;
