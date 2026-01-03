import React, { useState, useEffect } from "react";
import styles from "./Header.module.css";
import { Logo } from "../../atoms/Logo/Logo";
import { Button } from "../../atoms/Button/Button";
import { Avatar } from "../../atoms/Avatar/Avatar";
import { NavItem } from "../../molecules/NavItem/NavItem";
import { SearchBar } from "../../molecules/SearchBar/SearchBar";
import { useCategory } from "../../../contexts/CategoryContext";
import { useNotifications } from "../../../contexts/NotificationContext";
import { Bell, Heart, LogOut, MessageCircle } from "lucide-react";
import { API_URL } from "../../../config";

interface User {
  name: string;
  avatarUrl?: string;
  role?: string;
}

interface HeaderProps {
  user?: User;
  onPostAdClick: () => void;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onSignOutClick: () => void;
  onAvatarClick: () => void;
  onBecomeSellerClick: () => void;
  onAdminDashboardClick: () => void;
  onMessagesClick: () => void;
  onNotificationsClick: () => void;
  onFavouritesClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onPostAdClick,
  onLoginClick,
  onRegisterClick,
  onSignOutClick,
  onAvatarClick,
  onBecomeSellerClick,
  onAdminDashboardClick,
  onMessagesClick,
  onNotificationsClick,
  onFavouritesClick,
}) => {
  const currentPath = window.location.pathname;
  const { unreadCount } = useNotifications();
  const { selectedCategory, setSelectedCategory, setSearchQuery } = useCategory();
  const [categories, setCategories] = useState<string[]>([]);

  const getInitials = (name: string) => {
    const names = name.split(" ");
    const first = names[0]?.[0] || "";
    const last = names[names.length - 1]?.[0] || "";
    return `${first}${last}`.toUpperCase();
  };

  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then((res) => res.json())
      .then((data: string[]) => setCategories(data))
      .catch(console.error);
  }, []);

  const isTrustedOrAdmin = user?.role === "Trusted" || user?.role === "Admin";

  return (
    <header className={styles.headerContainer}>
      <div className={styles.headerLeft}>
        <a href="/" aria-label="Homepage">
          <Logo />
        </a>
      </div>

      <div className={styles.headerCenter}>
        <nav>
          <ul className={styles.headerNav}>
            <NavItem label="Browse" href="/browse" isActive={currentPath === "/browse"} />
            <NavItem label="About" href="/about" isActive={currentPath === "/about"} />
          </ul>
        </nav>

        <div className={styles.headerSearch}>
          <SearchBar
            placeholder="Search for items..."
            onSearch={setSearchQuery}
            categories={categories}
            onCategoryChange={setSelectedCategory}
            selectedCategory={selectedCategory}
          />
        </div>
      </div>

      <div className={styles.headerRight}>
        {user ? (
          <>
            {user.role === "Admin" && (
              <Button onClick={onAdminDashboardClick} variant="primary">
                Admin
              </Button>
            )}

            {user.role !== "Trusted" && user.role !== "Admin" && (
              <Button onClick={onBecomeSellerClick} variant="primary">
                Become Seller
              </Button>
            )}

            {isTrustedOrAdmin && (
              <Button onClick={onPostAdClick} variant="primary">
                Post Ad
              </Button>
            )}

            <Button onClick={onMessagesClick} variant="primary">
              <MessageCircle size={20} />
            </Button>

            <Button onClick={onNotificationsClick} variant="primary">
              <div className={styles.notificationWrapper}>
                <Bell size={25} />
                {unreadCount > 0 && (
                  <span className={styles.notificationBadge}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
            </Button>

            <Button 
              variant="primary"
              onClick={onFavouritesClick}
              aria-label="Mergi la favorite"
            >
              <Heart size={20} />
            </Button>

            <Button onClick={onSignOutClick} variant="primary">
              <LogOut size={20} />
            </Button>

            <button
              onClick={onAvatarClick}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label="User menu"
            >
              <Avatar src={user.avatarUrl} initials={getInitials(user.name)} />
            </button>
          </>
        ) : (
          <div className={styles.authButtons}>
            <Button onClick={onLoginClick} variant="secondary" className={styles.loginButton}>
              Login
            </Button>
            <Button onClick={onRegisterClick} variant="secondary" className={styles.registerButton}>
              Register
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};