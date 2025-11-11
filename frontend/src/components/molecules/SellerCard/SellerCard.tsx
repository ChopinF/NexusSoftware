import {AlertCircle, BadgeCheck} from "lucide-react";
import LocationAtom from "../../atoms/LocationAtom/LocationAtom.tsx";
import "./SellerCard.css"

const SellerCard: React.FC<{
    name: string;
    email: string;
    city: string;
    country: string;
    role: string;
}> = ({name, email, country, city, role}) => {

    const isTrusted = role.toLowerCase() === "trusted";

    return (
        <div className="seller-atom">
            <div className="seller-header">
                <h2 className="seller-title">Seller</h2>
                {isTrusted ? (
                    <span title="Trusted seller">
                        <BadgeCheck className="trusted-icon" size={18}/>
                    </span>
                ) : (
                    <span title="Unverified seller">
                        <AlertCircle className="not-trusted-icon" size={18}/>
                    </span>
                )}

            </div>
            <h3 className="seller-name">{name}</h3>
            <LocationAtom city={city} country={country}/>
            <p className="seller-email">{email}</p>
        </div>
    );
};

export default SellerCard;