import React, { useState } from "react";
import { ChatFab } from "../../molecules/ChatFab/ChatFab";
import { ChatWindow } from "../ChatWindow/ChatWindow";

export const ChatAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => setIsOpen((prev) => !prev);

  return (
    <>
      <ChatFab onClick={toggleChat} />

      {isOpen && <ChatWindow onClose={toggleChat} />}
    </>
  );
};
