import {Heart} from "lucide-react";
import "./FavoriteButton.css"

const FavoriteButton: React.FC<{ isFavorite: boolean; onClick: () => void }> = ({
                                                                                    isFavorite,
                                                                                    onClick
                                                                                }) => (
    <button
        onClick={onClick}
        className="favorite-button"
        aria-label="Add to favorites"
    >
        <Heart className={`heart-icon ${isFavorite ? 'favorited' : ''}`}/>
    </button>
);
export default FavoriteButton;