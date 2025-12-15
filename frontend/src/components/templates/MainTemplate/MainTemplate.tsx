import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../organisms/Header/Header";
import { Footer } from "../../organisms/Footer/Footer";
import { useUser } from "../../../contexts/UserContext";
import styles from "./MainTemplate.module.css";
import { ChatFab } from "../../molecules/ChatFab/ChatFab";
import { ChatWindow } from "../../organisms/ChatWindow/ChatWindow";

interface MainTemplateProps {
  children: React.ReactNode;
}

export const MainTemplate: React.FC<MainTemplateProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, setUser, setToken } = useUser();

  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleSignOut = async (): Promise<void> => {
    setUser(null);
    setToken(null);
    navigate("/login", { replace: true });
  };

  const toggleChat = () => setIsChatOpen((prev) => !prev);

  const handleLogin = () => {
    navigate("/login");
  };
  
  const handleRegister = () => {
    navigate("/register");
  };

  const handlePostAdClick = () => {
    navigate("/post-ad");
  };

  const handleBecomeSellerClick = () => {
    navigate("/become-seller");
  };

  const handleAdminDashboardClick = () => {
    navigate("/admin");
  };

  const handleMessagesClick = () => {
    navigate("/messages");
  };

  const handleNotificationsClick = () => {
    navigate("/my-notifications");
  };

  return (
    <div className={styles.layoutWrapper}>
      <Header
        user={
          user
            ? {
                name: user.name,
                avatarUrl: `https://placehold.co/40x40/e2e8f0/a0aec0?text=${user.name.charAt(
                  0
                )}`,
                role: user.role,
              }
            : undefined
        }
        onLoginClick={handleLogin}
        onRegisterClick={handleRegister}
        onSignOutClick={handleSignOut}
        onPostAdClick={handlePostAdClick}
        onBecomeSellerClick={handleBecomeSellerClick}
        onAdminDashboardClick={handleAdminDashboardClick}
        onMessagesClick={handleMessagesClick}
        onNotificationsClick={handleNotificationsClick}
        onAvatarClick={() => {
          /* navigate to /profile */
        }}
      />

      <main className={styles.contentArea}>{children}</main>

      {/* Chatbot components */}
      {isChatOpen && <ChatWindow onClose={toggleChat} />}
      <ChatFab onClick={toggleChat} />

      <Footer />
    </div>
  );
};
