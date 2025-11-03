import React from "react";
import styles from "./Header.module.css";

import { Logo } from "../../atoms/Logo/Logo";
import { Button } from "../../atoms/Button/Button";
import { Avatar } from "../../atoms/Avatar/Avatar";
import { NavItem } from "../../molecules/NavItem/NavItem";
import { SearchBar } from "../../molecules/SearchBar/SearchBar";

interface User {
  name: string;
  avatarUrl?: string;
}

interface HeaderProps {
  user?: User;
  onPostAdClick: () => void;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onSignOutClick: () => void;
  onSearch: (query: string) => void;
  onAvatarClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onPostAdClick,
  onLoginClick,
  onRegisterClick,
  onSignOutClick,
  onSearch,
  onAvatarClick,
}) => {
  const currentPath = window.location.pathname;

  const getInitials = (name: string) => {
    const names = name.split(" ");
    const first = names[0]?.[0] || "";
    const last = names[names.length - 1]?.[0] || "";
    return `${first}${last}`.toUpperCase();
  };

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
            <NavItem
              label="Browse"
              href="/browse"
              isActive={currentPath === "/browse"}
            />
            <NavItem
              label="About"
              href="/about"
              isActive={currentPath === "/about"}
            />
          </ul>
        </nav>

        <div className={styles.headerSearch}>
          <SearchBar placeholder="Search for items..." onSearch={onSearch} />
        </div>
      </div>

      <div className={styles.headerRight}>
        <Button onClick={onPostAdClick} variant="primary">
          Post Ad
        </Button>

        {user ? (
          <>
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
          <div>
            <Button
              onClick={onLoginClick}
              variant="secondary"
              className={styles.loginButton}
            >
              Login
            </Button>
            <Button
              onClick={onRegisterClick}
              variant="secondary"
              className={styles.registerButton}
            >
              Register
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
