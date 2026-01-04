import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../../contexts/UserContext";
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate";
import ConversationModal from "../../molecules/ConversationModal/ConversationModal";
import { MessageCircle, Trash2} from "lucide-react";
import { API_URL } from "../../../config";
import { Spinner } from "../../atoms/Spinner/Spinner";
import styles from "./MessagesPage.module.css";

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

function timeAgo(dateString?: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const MessagesPage = () => {
  const { user, token } = useUser();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const fetchConversations = async () => {
    if (!user?.id || !token) return;
    try {
      const res = await fetch(`${API_URL}/conversations/user/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch conversations");
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
          if (new Date(msg.created_at) > new Date(existing.last_message_time || "")) {
            existing.last_message = msg.message;
            existing.last_message_time = msg.created_at;
          }
          if (msg.is_read === 0 && msg.to_user === user.id) {
            existing.unread_count = (existing.unread_count || 0) + 1;
          }
        }
      });

      setConversations(Array.from(conversationMap.values()).sort((a, b) => 
        new Date(b.last_message_time || "").getTime() - new Date(a.last_message_time || "").getTime()
      ));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) navigate("/login");
    else fetchConversations();
  }, [user, token]);

  const filteredConversations = useMemo(() => {
    if (filter === 'unread') return conversations.filter(c => (c.unread_count || 0) > 0);
    return conversations;
  }, [conversations, filter]);

  const totalUnread = conversations.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);

  const getOtherPersonName = (conv: Conversation) => 
    user?.id === conv.seller_id ? conv.buyer_name || "Buyer" : conv.seller_name || "Seller";

  return (
    <MainTemplate>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h1>Messages</h1>
            {totalUnread > 0 && <span className={styles.badgeCount}>{totalUnread}</span>}
          </div>
        </div>

        <div className={styles.filters}>
          <button 
            className={`${styles.filterBtn} ${filter === 'all' ? styles.activeFilter : ''}`} 
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`${styles.filterBtn} ${filter === 'unread' ? styles.activeFilter : ''}`} 
            onClick={() => setFilter('unread')}
          >
            Unread
          </button>
        </div>

        <div className={styles.list}>
          {loading ? (
            <div className={styles.loader}><Spinner size="lg" /></div>
          ) : filteredConversations.length === 0 ? (
            <div className={styles.emptyState}>
              <MessageCircle size={48} style={{opacity: 0.5}} />
              <h3>No messages</h3>
              <p>Your conversations will appear here.</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div 
                key={conv.conversation_id}
                className={`${styles.card} ${conv.unread_count ? styles.unread : ''}`}
                onClick={() => setSelectedConversation(conv)}
              >
                <div className={styles.iconWrapper}>
                  <div className={styles.avatar}>
                    {getOtherPersonName(conv).charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className={styles.contentWrapper}>
                  <div className={styles.convoHeader}>
                    <span className={styles.name}>{getOtherPersonName(conv)}</span>
                    <span className={styles.timeText}>{timeAgo(conv.last_message_time)}</span>
                  </div>
                  <p className={styles.messageText}>{conv.last_message}</p>
                </div>
                <div className={styles.actionsWrapper}>
                  {conv.unread_count ? <div className={styles.indicator} /> : null}
                  <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={(e) => e.stopPropagation()}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedConversation && (
          <ConversationModal
            conversationId={selectedConversation.conversation_id}
            otherUserId={user?.id === selectedConversation.seller_id ? selectedConversation.buyer_id : selectedConversation.seller_id}
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