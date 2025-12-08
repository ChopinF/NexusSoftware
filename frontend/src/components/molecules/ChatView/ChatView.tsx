import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./ChatView.css";

const ChatView = ({
  sellerName,
  initialOffer,
  remoteMessages,
  onSend,
}: {
  sellerName: string;
  initialOffer?: string;
  remoteMessages?: {
    id: number;
    text: string;
    type: "sent" | "received" | "offer";
  }[];
  onSend?: (text: string) => Promise<any> | void;
}) => {
  const [messages, setMessages] = useState<
    { id: number; text: string; type: "sent" | "received" | "offer" }[]
  >(() => remoteMessages || []);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialOffer) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: `I would like to offer $${initialOffer} for this item.`,
          type: "offer",
        },
      ]);
    }
  }, [initialOffer]);

  // Sync remote messages when provided by parent (server-backed)
  useEffect(() => {
    if (remoteMessages) {
      setMessages(remoteMessages);
    }
  }, [remoteMessages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText("");

    if (onSend) {
      // When server-backed, let parent append the message and sync via remoteMessages
      Promise.resolve(onSend(text)).catch((err) => {
        console.error("send error", err);
      });
    } else {
      // Local-only behavior: append locally and simulate reply
      setMessages((prev) => [...prev, { id: Date.now(), text, type: "sent" }]);

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text: "Thanks for the message! I'll get back to you shortly.",
            type: "received",
          },
        ]);
      }, 1000);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="avatar">{sellerName.substring(0, 2).toUpperCase()}</div>
        <div>
          <div style={{ fontWeight: 600, color: "white" }}>{sellerName}</div>
          <div className="chat-status">
            <div className="status-dot"></div>
            Online
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6b7280",
              opacity: 0.6,
            }}
          >
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`msg-wrapper ${
              msg.type === "received" ? "received" : ""
            }`}
          >
            <div
              className={`msg-bubble ${
                msg.type === "offer" ? "offer-msg" : ""
              }`}
            >
              {msg.type === "offer" && (
                <span className="offer-label">New Offer</span>
              )}
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <input
          className="chat-input"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button className="btn-send" onClick={handleSend}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default ChatView;
