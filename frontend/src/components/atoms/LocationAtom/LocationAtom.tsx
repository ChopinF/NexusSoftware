import {MapPin} from "lucide-react";
import "./LocationAtom.css"

const LocationAtom: React.FC<{ city: string; country: string; }> = ({city, country}) => {
    return (
        <div className="location-atom">
            <MapPin className="location-icon" size={16} strokeWidth={2}/>
            <span className="location-text">
        {city}, {country}
      </span>
        </div>
    );
};
export default LocationAtom;