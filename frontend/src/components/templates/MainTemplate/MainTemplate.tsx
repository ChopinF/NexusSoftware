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
  const { setUser, setToken } = useUser();

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

  const handleFavouritesClick = () => {
    navigate("/my-favourites");
  }

  const handleMyProductsClick = () => {
    navigate("/my-products");
  }

  const handleProfileClick = () => {
    navigate("/my-profile");
  }

  const handleDealsClick = () => {
    navigate("/deals")
  }

  const handleOrdersClick = () => {
    navigate("/orders")
  }

  return (
    <div className={styles.layoutWrapper}>
      <Header
        onLoginClick={handleLogin}
        onRegisterClick={handleRegister}
        onSignOutClick={handleSignOut}
        onPostAdClick={handlePostAdClick}
        onBecomeSellerClick={handleBecomeSellerClick}
        onAdminDashboardClick={handleAdminDashboardClick}
        onMessagesClick={handleMessagesClick}
        onNotificationsClick={handleNotificationsClick}
        onFavouritesClick={handleFavouritesClick}
        onMyProductsClick={handleMyProductsClick}
        onProfileClick={handleProfileClick}
        onDealsClick={handleDealsClick}
        onOrdersClick={handleOrdersClick}
      />

      <main className={styles.contentArea}>{children}</main>

      {/* Chatbot components */}
      {isChatOpen && <ChatWindow onClose={toggleChat} />}
      <ChatFab onClick={toggleChat} />

      <Footer />
    </div>
  );
};