import React from "react";


interface Props {
    selectedCategory: string;
    onCategoryChange: (value: string) => void;
}

const CATEGORIES = [
    "Electronics",
    "Clothing",
    "Books",
    "Home",
    "Toys",
    "Other"
];

const CategoryFilter: React.FC<Props> = ({ selectedCategory, onCategoryChange }) => {
    return (
        <div className="flex items-center gap-2">
            <label htmlFor="category" className="font-medium text-gray-300">
                Categorie:
            </label>
            <select
                id="category"
                value={selectedCategory}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="bg-gray-800 text-white border border-gray-600 rounded-md p-2"
            >
                <option value="">Toate</option>
                {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                        {cat}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default CategoryFilter;
