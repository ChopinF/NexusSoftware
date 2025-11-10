import React from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../organisms/Header/Header";
import { Footer } from "../../organisms/Footer/Footer";
import { useUser } from "../../../contexts/UserContext";
import styles from "./MainTemplate.module.css";

interface MainTemplateProps {
  children: React.ReactNode;
}

export const MainTemplate: React.FC<MainTemplateProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, setUser, setToken } = useUser();

  const handleSignOut = async (): Promise<void> => {
    setUser(null);
    setToken(null);
    navigate("/login", { replace: true });
  };

  return (
    <div className={styles.layoutWrapper}>
      <Header
        user={
          user
            ? {
                name: user.name,
                avatarUrl: `https://placehold.co/40x40/e2e8f0/a0aec0?text=${user.name}`,
              }
            : undefined
        }
        onLoginClick={() => {
          navigate("/login");
        }}
        onRegisterClick={() => {
          navigate("/register");
        }}
        onSignOutClick={handleSignOut}
        onPostAdClick={() => {
          navigate("/post-ad");
        }}
        onSearch={(query) => {
          console.log("Search query:", query);
        }}
        onAvatarClick={() => {
          /* navigate to /profile */
        }}
      />

      <main className={styles.contentArea}>{children}</main>

      <Footer />
    </div>
  );
};
