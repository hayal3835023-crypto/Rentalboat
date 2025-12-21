import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';

export const DestinationCard = ({ destination }) => {
  const navigate = useNavigate();

  return (
    <div 
      className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group"
      onClick={() => navigate(`/search?city=${destination.city}`)}
      data-testid={`destination-${destination.city.toLowerCase()}`}
    >
      <img 
        src={destination.image}
        alt={destination.city}
        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
      />
      
      <div className="absolute inset-0 destination-overlay" />
      
      <div className="absolute bottom-4 left-4 right-4 text-white">
        <div className="flex items-center gap-1 text-sm opacity-80 mb-1">
          <MapPin size={14} />
          <span>{destination.region}</span>
        </div>
        <h3 className="text-xl font-bold">{destination.city}</h3>
        <p className="text-sm opacity-80 mt-1">
          {destination.boat_count} bateaux disponibles
        </p>
      </div>
    </div>
  );
};
