import "./CategoryBadge.css"

const CategoryBadge: React.FC<{ category: string }> = ({category}) => (
    <span className="category-badge">
    {category}
  </span>
);

export default CategoryBadge;