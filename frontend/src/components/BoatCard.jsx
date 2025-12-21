import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Star, MapPin, Users, Anchor } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const BoatCard = ({ boat, onFavoriteChange }) => {
  const navigate = useNavigate();
  const { user, getAuthHeaders } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleFavoriteClick = async (e) => {
    e.stopPropagation();
    
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      if (isFavorite) {
        await axios.delete(`${API}/favorites/${boat.boat_id}`, {
          headers: getAuthHeaders()
        });
        setIsFavorite(false);
        toast.success('Retiré des favoris');
      } else {
        await axios.post(`${API}/favorites/${boat.boat_id}`, {}, {
          headers: getAuthHeaders()
        });
        setIsFavorite(true);
        toast.success('Ajouté aux favoris');
      }
      onFavoriteChange?.();
    } catch (error) {
      toast.error('Une erreur est survenue');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div 
      className="boat-card bg-white rounded-2xl overflow-hidden border border-slate-100 cursor-pointer"
      onClick={() => navigate(`/boat/${boat.boat_id}`)}
      data-testid={`boat-card-${boat.boat_id}`}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={boat.images?.[currentImageIndex] || 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800'}
          alt={boat.name}
          className="w-full h-full object-cover gallery-image"
        />
        
        {/* Price Tag */}
        <div className="absolute top-3 left-3">
          <span className="price-tag">
            {formatPrice(boat.price_per_day)}/jour
          </span>
        </div>

        {/* Favorite Button */}
        <button 
          onClick={handleFavoriteClick}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center heart-button ${isFavorite ? 'active' : ''}`}
          data-testid="favorite-button"
        >
          <Heart 
            size={20} 
            className={isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-600'} 
          />
        </button>

        {/* Verified Badge */}
        {boat.is_verified && (
          <div className="absolute bottom-3 left-3">
            <Badge className="badge-verified text-xs">
              <Anchor size={12} className="mr-1" />
              Vérifié
            </Badge>
          </div>
        )}

        {/* Image Dots */}
        {boat.images?.length > 1 && (
          <div className="absolute bottom-3 right-3 flex gap-1">
            {boat.images.slice(0, 5).map((_, idx) => (
              <span 
                key={idx} 
                className={`carousel-dot ${idx === currentImageIndex ? 'active' : ''}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-slate-900 line-clamp-1">{boat.name}</h3>
          {boat.rating > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Star size={14} className="fill-orange-500 text-orange-500" />
              <span className="font-medium">{boat.rating.toFixed(1)}</span>
              <span className="text-slate-400">({boat.review_count})</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-slate-500 text-sm mb-3">
          <MapPin size={14} />
          <span>{boat.city}</span>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span>{boat.capacity} personnes</span>
          </div>
          <span>{boat.length}m</span>
        </div>
      </div>
    </div>
  );
};
