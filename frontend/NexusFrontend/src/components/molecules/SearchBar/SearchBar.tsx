import React, { useState } from "react";
import styles from "./SearchBar.module.css";

import { Input } from "../../atoms/Input/Input";
import { Button } from "../../atoms/Button/Button";

const SearchIcon = () => (
  <svg
    xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)"
    width="16"
    height="16"
    fill="currentColor"
    viewBox="0 0 16 16"
  >
    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
  </svg>
);

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = "Search for items...",
}) => {
  const [query, setQuery] = useState<string>("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(query);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <form
      className={styles.searchBarContainer}
      onSubmit={handleSubmit}
      role="search"
    >
      <Input
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        className={styles.searchInput}
        aria-label="Search"
      />
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
