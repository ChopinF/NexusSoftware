import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../../contexts/UserContext";
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate";
import ConversationModal from "../../molecules/ConversationModal/ConversationModal";
import styles from "./MessagesPage.module.css";
import { MessageCircle } from "lucide-react";
import { API_URL } from "../../../config";

interface Conversation {
  conversation_id: string;
  seller_id: string;
  buyer_id: string;
  seller_name?: string;
  buyer_name?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

export const MessagesPage = () => {
  const { user, token } = useUser();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  const fetchConversations = async () => {
    if (!user?.id || !token) return;

    try {
      const res = await fetch(`${API_URL}/conversations/user/${user.id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch conversations");
      }

      const data = await res.json();

      const conversationMap = new Map<string, Conversation>();

      data.forEach((msg: any) => {
        const convId = msg.conversation_id;
        if (!conversationMap.has(convId)) {
          conversationMap.set(convId, {
            conversation_id: convId,
            seller_id: msg.seller_id,
            buyer_id: msg.buyer_id,
            seller_name: msg.seller_name,
            buyer_name: msg.buyer_name,
            last_message: msg.message,
            last_message_time: msg.created_at,
            unread_count: msg.is_read === 0 && msg.to_user === user.id ? 1 : 0,
          });
        } else {
          const existing = conversationMap.get(convId)!;
          if (
            new Date(msg.created_at) >
            new Date(existing.last_message_time || "")
          ) {
            existing.last_message = msg.message;
            existing.last_message_time = msg.created_at;
          }
          if (msg.is_read === 0 && msg.to_user === user.id) {
            existing.unread_count = (existing.unread_count || 0) + 1;
          }
        }
      });

      const conversationsList = Array.from(conversationMap.values());
      conversationsList.sort(
        (a, b) =>
          new Date(b.last_message_time || "").getTime() -
          new Date(a.last_message_time || "").getTime()
      );

      setConversations(conversationsList);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    fetchConversations();
  }, [user, token, navigate]);

  const getOtherPersonName = (conv: Conversation) => {
    if (user?.id === conv.seller_id) {
      return conv.buyer_name || "Unknown Buyer";
    }
    return conv.seller_name || "Unknown Seller";
  };

  const getOtherPersonId = (conv: Conversation) => {
    if (user?.id === conv.seller_id) {
      return conv.buyer_id;
    }
    return conv.seller_id;
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  return (
    <MainTemplate>
      <div className={styles.messagesContainer}>
        <div className={styles.header}>
          <MessageCircle size={28} />
          <h1>Messages</h1>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className={styles.empty}>
            <MessageCircle size={48} className={styles.emptyIcon} />
            <p>No conversations yet</p>
            <p className={styles.emptySubtext}>
              Start chatting with sellers or buyers!
            </p>
          </div>
        ) : (
          <div className={styles.conversationsList}>
            {conversations.map((conv) => (
              <div
                key={conv.conversation_id}
                className={`${styles.conversationItem} ${
                  conv.unread_count ? styles.unread : ""
                }`}
                onClick={() => setSelectedConversation(conv)}
              >
                <div className={styles.avatar}>
                  {getOtherPersonName(conv).charAt(0).toUpperCase()}
                </div>
                <div className={styles.conversationInfo}>
                  <div className={styles.conversationHeader}>
                    <span className={styles.name}>
                      {getOtherPersonName(conv)}
                    </span>
                    <span className={styles.time}>
                      {formatTime(conv.last_message_time)}
                    </span>
                  </div>
                  <div className={styles.lastMessage}>
                    {conv.last_message || "No messages yet"}
                  </div>
                </div>
                {conv.unread_count ? (
                  <div className={styles.unreadBadge}>{conv.unread_count}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {selectedConversation && (
          <ConversationModal
            conversationId={selectedConversation.conversation_id}
            otherUserId={getOtherPersonId(selectedConversation)}
            otherUserName={getOtherPersonName(selectedConversation)}
            onClose={() => {
              setSelectedConversation(null);
              fetchConversations();
            }}
          />
        )}
      </div>
    </MainTemplate>
  );
};
