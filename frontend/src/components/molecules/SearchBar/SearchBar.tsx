import React, { useState, useRef, useEffect } from "react";
import styles from "./SearchBar.module.css";
import { useCategory } from "../../../contexts/CategoryContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  ChevronDown,
  Book,
  Laptop,
  Home,
  Tag,
  LayoutGrid,
  Shirt,
  Box,
  X,
} from "lucide-react";

const STATIC_CATEGORIES = ["Electronics", "Books", "Clothes", "Home", "Other"];

const getCategoryIcon = (category: string) => {
  const normalized = category.toLowerCase();
  if (normalized.includes("book")) return <Book size={16} />;
  if (normalized.includes("electronic") || normalized.includes("tech"))
    return <Laptop size={16} />;
  if (normalized.includes("home") || normalized.includes("house"))
    return <Home size={16} />;
  if (normalized.includes("cloth") || normalized.includes("fashion"))
    return <Shirt size={16} />;
  if (normalized.includes("other")) return <Box size={16} />;
  return <Tag size={16} />;
};

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = "Search for items...",
}) => {
  const [query, setQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const isInitialMount = useRef(true);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const { selectedCategory, setSelectedCategory, setSearchQuery } =
    useCategory();

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      executeSearch(query);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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

  const executeSearch = (searchVal: string) => {
    setSearchQuery(searchVal);
    if (onSearch) onSearch(searchVal);

    if (location.pathname !== "/" && searchVal.trim() !== "") {
      navigate("/");
    }
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setIsDropdownOpen(false);

    if (location.pathname !== "/") {
      navigate("/");
    }
  };

  return (
    <div className={styles.searchBarContainer}>
      <div className={styles.searchInner}>
        <div className={styles.inputWrapper}>
          <Search size={18} className={styles.innerSearchIcon} />
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.searchInput}
          />
          {query && (
            <button
              className={styles.clearButton}
              onClick={() => setQuery("")}
              type="button"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className={styles.divider} />

        <button
          type="button"
          className={styles.categoryTrigger}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          ref={triggerRef}
        >
          <span className={styles.selectedIcon}>
            {selectedCategory ? (
              getCategoryIcon(selectedCategory)
            ) : (
              <LayoutGrid size={16} />
            )}
          </span>
          <span className={styles.selectedText}>
            {selectedCategory || "All Categories"}
          </span>
          <ChevronDown
            size={14}
            className={`${styles.chevron} ${
              isDropdownOpen ? styles.chevronOpen : ""
            }`}
          />
        </button>
      </div>

      {isDropdownOpen && (
        <ul className={styles.dropdownMenu} ref={menuRef}>
          <li
            className={`${styles.dropdownItem} ${
              !selectedCategory ? styles.activeItem : ""
            }`}
            onClick={() => handleCategorySelect("")}
          >
            <span className={styles.itemIcon}>
              <LayoutGrid size={16} />
            </span>
            All Categories
          </li>
          {STATIC_CATEGORIES.map((cat) => (
            <li
              key={cat}
              className={`${styles.dropdownItem} ${
                selectedCategory === cat ? styles.activeItem : ""
              }`}
              onClick={() => handleCategorySelect(cat)}
            >
              <span className={styles.itemIcon}>{getCategoryIcon(cat)}</span>
              {cat}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
