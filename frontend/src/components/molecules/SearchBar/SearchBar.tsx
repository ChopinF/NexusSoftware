import React, { useState, useRef, useEffect } from "react";
import styles from "./SearchBar.module.css";
import { Input } from "../../atoms/Input/Input";
import { Button } from "../../atoms/Button/Button";
import { useCategory } from "../../../contexts/CategoryContext";
import { useNavigate, useLocation } from "react-router-dom";

// --- Icons ---
const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    fill="currentColor"
    viewBox="0 0 16 16"
  >
    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    width="10"
    height="6"
    viewBox="0 0 10 6"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M1 1L5 5L9 1"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const getCategoryIcon = (category: string) => {
  const normalized = category.toLowerCase();
  if (normalized.includes("book"))
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    );
  if (normalized.includes("electronic") || normalized.includes("tech"))
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="1" y1="9" x2="4" y2="9" />
      </svg>
    );
  if (normalized.includes("home") || normalized.includes("house"))
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  );
};

const AllIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  categories?: string[];
  selectedCategory?: string;
  onCategoryChange?: (cat: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = "Search for items...",
  categories = [],
  selectedCategory: propSelectedCategory,
  onCategoryChange: propOnCategoryChange,
}) => {
  const [query, setQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Refs for click-outside detection
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const {
    selectedCategory: ctxSelectedCategory,
    setSelectedCategory,
    setSearchQuery,
  } = useCategory();
  const currentSelectedCategory = propSelectedCategory ?? ctxSelectedCategory;
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close if click is NOT in trigger AND NOT in menu
      const target = event.target as Node;
      if (
        isDropdownOpen &&
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  const executeSearch = (searchQuery: string) => {
    setSearchQuery(searchQuery);
    if (onSearch) onSearch(searchQuery);
    if (location.pathname !== "/") {
      navigate("/");
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleCategorySelect = (category: string) => {
    if (propOnCategoryChange) propOnCategoryChange(category);
    else setSelectedCategory(category);
    setIsDropdownOpen(false);
    executeSearch(query);
  };

  return (
    <form
      className={styles.searchBarContainer}
      onSubmit={handleSubmit}
      role="search"
    >
      {/* 1. Category Trigger (Direct Child) */}
      <button
        type="button"
        className={styles.categoryTrigger}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        ref={triggerRef}
      >
        <span className={styles.selectedIcon}>
          {currentSelectedCategory ? (
            getCategoryIcon(currentSelectedCategory)
          ) : (
            <AllIcon />
          )}
        </span>
        <span className={styles.selectedText}>
          {currentSelectedCategory ?? "All Categories"}
        </span>
        <ChevronDownIcon
          className={`${styles.chevron} ${
            isDropdownOpen ? styles.chevronOpen : ""
          }`}
        />
      </button>

      {/* 2. Divider (Direct Child) */}
      <div className={styles.divider} />

      {/* 3. Dropdown Menu (Direct Child, Positioned Absolute) */}
      {isDropdownOpen && (
        <ul className={styles.dropdownMenu} ref={menuRef}>
          <li
            className={`${styles.dropdownItem} ${
              !currentSelectedCategory ? styles.activeItem : ""
            }`}
            onClick={() => handleCategorySelect("")}
          >
            <span className={styles.itemIcon}>
              <AllIcon />
            </span>
            All Categories
          </li>
          {categories.map((cat) => (
            <li
              key={cat}
              className={`${styles.dropdownItem} ${
                currentSelectedCategory === cat ? styles.activeItem : ""
              }`}
              onClick={() => handleCategorySelect(cat)}
            >
              <span className={styles.itemIcon}>{getCategoryIcon(cat)}</span>
              {cat}
            </li>
          ))}
        </ul>
      )}

      {/* 4. Input */}
      <Input
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={styles.searchInput}
        aria-label="Search"
      />

      {/* 5. Button */}
      <Button
        type="submit"
        variant="primary"
        className={styles.searchButton}
        aria-label="Submit search"
      >
        <SearchIcon />
      </Button>
    </form>
  );
};
