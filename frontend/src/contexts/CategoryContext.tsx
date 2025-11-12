import React, { createContext, useContext, useState } from "react";

interface CategoryContextType {
    selectedCategory: string;
    setSelectedCategory: (cat: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedCategory, setSelectedCategory] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <CategoryContext.Provider
            value={{ selectedCategory, setSelectedCategory, searchQuery, setSearchQuery }}
        >
            {children}
        </CategoryContext.Provider>
    );
};

export const useCategory = () => {
    const ctx = useContext(CategoryContext);
    if (!ctx) throw new Error("useCategory must be used within a CategoryProvider");
    return ctx;
};
