import React, { useState, useRef, useEffect } from "react";
import { v4 as uuid } from "uuid";
import styles from "./ChatWindow.module.css";
import { API_URL } from "../../../config";

import { Input } from "../../atoms/Input/Input";
import { Button } from "../../atoms/Button/Button";
import { Spinner } from "../../atoms/Spinner/Spinner";

const CloseIcon = () => (
  <svg
    className={styles.closeIcon}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SendIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2 .01 7z" />
  </svg>
);

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
}

interface ChatWindowProps {
  onClose: () => void;
}

const defaultMessage: Message = {
  id: uuid(),
  text: "Bună! Sunt asistentul tău virtual. Cum te pot ajuta azi?",
  sender: "bot",
};

export const ChatWindow: React.FC<ChatWindowProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = sessionStorage.getItem("chatMessages");
    return savedMessages ? JSON.parse(savedMessages) : [defaultMessage];
  });

  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionStorage.setItem("chatMessages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = userInput.trim();
    if (!text) return;

    const userMessage: Message = { id: uuid(), text, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/msg`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        throw new Error("Răspunsul de la server nu a fost OK");
      }

      const data = await res.json();
      const botMessage: Message = {
        id: uuid(),
        text: data.message || "Scuze, nu am putut procesa cererea.",
        sender: "bot",
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error("Eroare la chat:", err);
      const errorMessage: Message = {
        id: uuid(),
        text: "A apărut o eroare. Te rog încearcă din nou.",
        sender: "bot",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.chatOverlay}>
      <header className={styles.header}>
        <h3 className={styles.headerTitle}>Edger Assistant</h3>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </header>

      <div className={styles.messageList} ref={messageListRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.message} ${
              msg.sender === "user" ? styles.messageUser : styles.messageBot
            }`}
          >
            {msg.text}
          </div>
        ))}
        {isLoading && (
          <div className={styles.loadingSpinner}>
            <Spinner size="sm" />
          </div>
        )}
      </div>

      <form className={styles.inputArea} onSubmit={handleSend}>
        <Input
          type="text"
          placeholder="Scrie mesajul tău..."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          disabled={isLoading}
          className={styles.chatInput}
          autoComplete="off"
        />
        <Button type="submit" size="md" disabled={isLoading}>
          <SendIcon />
        </Button>
      </form>
    </div>
  );
};