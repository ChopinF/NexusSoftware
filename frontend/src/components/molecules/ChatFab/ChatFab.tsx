import React from "react";
import styles from "./ChatFab.module.css";

const ChatIcon = () => (
  <svg
    className={styles.chatIcon}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.719A7.908 7.908 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);

interface ChatFabProps {
  onClick: () => void;
}

export const ChatFab: React.FC<ChatFabProps> = ({ onClick }) => {
  return (
    <button
      type="button"
      className={styles.chatFab}
      onClick={onClick}
      aria-label="Deschide chat-ul cu asistentul"
    >
      <ChatIcon />
    </button>
  );
};