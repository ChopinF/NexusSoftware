import React, { useEffect, useState } from "react";
import styles from "./Header.module.css";
import { Logo } from "../../atoms/Logo/Logo";
import { Button } from "../../atoms/Button/Button";
import { Avatar } from "../../atoms/Avatar/Avatar";
import { NavItem } from "../../molecules/NavItem/NavItem";
import { SearchBar } from "../../molecules/SearchBar/SearchBar";
import { useCategory } from "../../../contexts/CategoryContext";

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
}) => {
  const currentPath = window.location.pathname;

  const getInitials = (name: string) => {
    const names = name.split(" ");
    const first = names[0]?.[0] || "";
    const last = names[names.length - 1]?.[0] || "";
    return `${first}${last}`.toUpperCase();
  };

  const { selectedCategory, setSelectedCategory, setSearchQuery } = useCategory();
  const [categories, setCategories] = useState<string[]>([]);

  React.useEffect(() => {
    fetch("http://localhost:3000/categories")
      .then((res) => res.json())
      .then((data: string[]) => {
        setCategories(data);
      })
      .catch(console.error);
  }, []);

  const isTrustedOrAdmin = user?.role === 'Trusted' || user?.role === 'Admin';

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
            {/* 1. Admin Button (First) */}
            {user.role === 'Admin' && (
              <Button onClick={onAdminDashboardClick} variant="primary">
                Admin
              </Button>
            )}

            {/* 2. Become Seller (Second) - Only for Untrusted */}
            {user.role !== 'Trusted' && user.role !== 'Admin' && (
              <Button onClick={onBecomeSellerClick} variant="primary">
                Become Seller
              </Button>
            )}

            {/* 3. Post Ad (Third) - Only for Trusted/Admin */}
            {isTrustedOrAdmin && (
              <Button onClick={onPostAdClick} variant="primary">
                Post Ad
              </Button>
            )}

            {/* 4. Sign Out and Avatar (Last) */}
            <Button
              onClick={onSignOutClick}
              variant="primary"
              className={styles.userNameButton}
            >
              Sign Out
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