import React, { useState, useEffect, useRef } from "react";
import styles from "./Header.module.css";
import { Logo } from "../../atoms/Logo/Logo";
import { Avatar } from "../../atoms/Avatar/Avatar";
import { NavItem } from "../../molecules/NavItem/NavItem";
import { SearchBar } from "../../molecules/SearchBar/SearchBar";
import { useCategory } from "../../../contexts/CategoryContext";
import { useNotifications } from "../../../contexts/NotificationContext";
// 1. IMPORT IMPORTANT: Luăm userul din Context
import { useUser } from "../../../contexts/UserContext"; 
import { Button } from "../../atoms/Button/Button";
import { 
  Bell, Heart, LogOut, MessageCircle, Package, 
  User as UserIcon, Shield, Store, PlusCircle 
} from "lucide-react";
import { API_URL } from "../../../config";

// 2. MODIFICARE INTERFACE: Am scos 'user' din props.
// Header-ul nu mai așteaptă user de la părinte.
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
}) => {
  // 3. CONECTARE LA CONTEXT
  const { user } = useUser(); 

  const currentPath = window.location.pathname;
  const { unreadCount } = useNotifications();
  const { selectedCategory, setSelectedCategory, setSearchQuery } = useCategory();
  const [categories, setCategories] = useState<string[]>([]);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 4. FUNCȚIE "DEFENSIVĂ" PENTRU INIȚIALE
  // Acum acceptă (name?: string) și verifică dacă există înainte să dea .split
  const getInitials = (name?: string) => {
    if (!name) return "??"; // Fallback dacă numele nu s-a încărcat încă
    
    const names = name.split(" ");
    const first = names[0]?.[0] || "";
    const last = names[names.length - 1]?.[0] || "";
    return `${first}${last}`.toUpperCase();
  };

  // 5. CALCULAREA SURSEI IMAGINII
  // A. Dacă avem imaginea Base64 (avatarImage) venită prin /me sau /login -> o folosim.
  // B. Altfel, dacă avem un URL vechi (avatarUrl) -> îl combinăm cu API_URL.
  // C. Altfel -> undefined (Avatar va afișa inițialele).
  const avatarSrc = user?.avatarImage 
    ? user.avatarImage 
    : user?.avatarUrl 
      ? `${API_URL}${user.avatarUrl}` 
      : undefined;

  // Încărcare categorii (partea existentă)
  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then((res) => res.json())
      .then((data: string[]) => setCategories(data))
      .catch(console.error);
  }, []);

  // Închidere dropdown la click în afară
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
      {/* --- PARTEA STÂNGĂ (LOGO) --- */}
      <div className={styles.headerLeft}>
        <a href="/" aria-label="Homepage">
          <Logo />
        </a>
      </div>

      {/* --- PARTEA CENTRALĂ (NAV + SEARCH) --- */}
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

      {/* --- PARTEA DREAPTĂ (USER SAU LOGIN) --- */}
      <div className={styles.headerRight}>
        {user ? (
          // DACA USER E LOGAT
          <div className={styles.userMenuContainer} ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={styles.avatarButton}
              aria-label="User menu"
              aria-expanded={isDropdownOpen}
            >
              <div style={{ position: 'relative' }}>
                {/* Folosim componenta Avatar cu datele calculate */}
                {/* Folosim (user.name || "") ca să fim siguri că nu trimitem undefined */}
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

                {user.role !== "Trusted" && user.role !== "Admin" && (
                  <button onClick={() => handleMenuClick(onBecomeSellerClick)} className={styles.dropdownItem}>
                    <Store size={18} /> Become Seller
                  </button>
                )}

                {isTrustedOrAdmin && (
                  <button onClick={() => handleMenuClick(onPostAdClick)} className={styles.dropdownItem}>
                    <PlusCircle size={18} /> Post Ad
                  </button>
                )}

                <div className={styles.separator} />

                <button onClick={() => handleMenuClick(onMyProductsClick)} className={styles.dropdownItem}>
                  <Package size={18} /> My Products
                </button>

                <button onClick={() => handleMenuClick(onMessagesClick)} className={styles.dropdownItem}>
                  <MessageCircle size={18} /> Messages
                </button>

                <button onClick={() => handleMenuClick(onNotificationsClick)} className={styles.dropdownItem}>
                  <Bell size={18} /> Notifications
                  {unreadCount > 0 && (
                    <span className={styles.menuBadge}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
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
          // DACA USER NU E LOGAT
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