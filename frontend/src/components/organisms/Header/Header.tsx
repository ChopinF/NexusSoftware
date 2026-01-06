import React, { useState, useEffect, useRef } from "react";
import styles from "./Header.module.css";
import { Logo } from "../../atoms/Logo/Logo";
import { Avatar } from "../../atoms/Avatar/Avatar";
import { NavItem } from "../../molecules/NavItem/NavItem";
import { SearchBar } from "../../molecules/SearchBar/SearchBar";
import { useCategory } from "../../../contexts/CategoryContext";
import { useNotifications } from "../../../contexts/NotificationContext";
import { useUser } from "../../../contexts/UserContext"; 
import { Button } from "../../atoms/Button/Button";
import { 
  Bell, Heart, LogOut, MessageCircle, Package, 
  User as UserIcon, Shield, Store, PlusCircle, Handshake, ShoppingBag 
} from "lucide-react"; // 1. Am adăugat ShoppingBag
import { API_URL } from "../../../config";

interface HeaderProps {
  onPostAdClick: () => void;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onSignOutClick: () => void;
  onProfileClick: () => void;
  onBecomeSellerClick: () => void;
  onAdminDashboardClick: () => void;
  onMessagesClick: () => void;
  onNotificationsClick: () => void;
  onFavouritesClick: () => void;
  onMyProductsClick: () => void;
  onDealsClick: () => void;
  onOrdersClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onPostAdClick,
  onLoginClick,
  onRegisterClick,
  onSignOutClick,
  onProfileClick,
  onBecomeSellerClick,
  onAdminDashboardClick,
  onMessagesClick,
  onNotificationsClick,
  onFavouritesClick,
  onMyProductsClick,
  onDealsClick,
  onOrdersClick,
}) => {
  const { user } = useUser(); 

  const currentPath = window.location.pathname;
  const { unreadCount } = useNotifications();
  const { setSearchQuery } = useCategory();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getInitials = (name?: string) => {
    if (!name) return "??";
    
    const names = name.split(" ");
    const first = names[0]?.[0] || "";
    const last = names[names.length - 1]?.[0] || "";
    return `${first}${last}`.toUpperCase();
  };

  const avatarSrc = user?.avatarImage 
    ? user.avatarImage 
    : user?.avatarUrl 
      ? `${API_URL}${user.avatarUrl}` 
      : undefined;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuClick = (action: () => void) => {
    action();
    setIsDropdownOpen(false);
  };

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
          />
        </div>
      </div>

      <div className={styles.headerRight}>
        {user ? (
          <div className={styles.userMenuContainer} ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={styles.avatarButton}
              aria-label="User menu"
              aria-expanded={isDropdownOpen}
            >
              <div style={{ position: 'relative' }}>
                <Avatar 
                    src={avatarSrc} 
                    initials={getInitials(user.name || "")} 
                    size="md"
                />
                
                {unreadCount > 0 && (
                  <span className={styles.notificationBadge} style={{ width: '15px', height: '15px', minWidth: '12px', right: '-2px', top: '-2px', border: '2px solid #111827' }}></span>
                )}
              </div>
            </button>

            {isDropdownOpen && (
              <div className={styles.dropdownMenu}>
                <div className={styles.menuHeader}>
                    Signed in as <br />
                    <span>{user.name}</span>
                </div>

                {user.role === "Admin" && (
                  <button onClick={() => handleMenuClick(onAdminDashboardClick)} className={styles.dropdownItem}>
                    <Shield size={18} /> Admin Dashboard
                  </button>
                )}

                {!isTrustedOrAdmin && (
                  <button onClick={() => handleMenuClick(onBecomeSellerClick)} className={styles.dropdownItem}>
                    <Store size={18} /> Become Seller
                  </button>
                )}

                {isTrustedOrAdmin && (
                  <>
                    <button onClick={() => handleMenuClick(onPostAdClick)} className={styles.dropdownItem}>
                      <PlusCircle size={18} /> Post Ad
                    </button>

                    <button onClick={() => handleMenuClick(onMyProductsClick)} className={styles.dropdownItem}>
                      <Package size={18} /> My Products
                    </button>
                  </>
                )}

                <button onClick={() => handleMenuClick(onOrdersClick)} className={styles.dropdownItem}>
                  <ShoppingBag size={18} /> My Orders
                </button>

                <button onClick={() => handleMenuClick(onDealsClick)} className={styles.dropdownItem}>
                  <Handshake size={18} /> Offers
                </button>
                
                <div className={styles.separator} />

                <button onClick={() => handleMenuClick(onNotificationsClick)} className={styles.dropdownItem}>
                  <Bell size={18} /> Notifications
                  {unreadCount > 0 && (
                    <span className={styles.menuBadge}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                <button onClick={() => handleMenuClick(onMessagesClick)} className={styles.dropdownItem}>
                  <MessageCircle size={18} /> Messages
                </button>

                <button onClick={() => handleMenuClick(onFavouritesClick)} className={styles.dropdownItem}>
                  <Heart size={18} /> Favorites
                </button>

                <button onClick={() => handleMenuClick(onProfileClick)} className={styles.dropdownItem}>
                    <UserIcon size={18} /> Profile
                </button>

                <div className={styles.separator} />

                <button 
                  onClick={() => handleMenuClick(onSignOutClick)} 
                  className={`${styles.dropdownItem} ${styles.logoutItem}`}
                >
                  <LogOut size={18} /> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem' }}>
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