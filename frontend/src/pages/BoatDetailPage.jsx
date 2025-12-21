import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Heart, Share2, Star, MapPin, Users, Ruler, Calendar,
  Anchor, Check, ChevronLeft, ChevronRight, MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BoatDetailPage() {
  const { boatId } = useParams();
  const navigate = useNavigate();
  const { user, getAuthHeaders } = useAuth();

  const [boat, setBoat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    loadBoat();
    if (user) checkFavorite();
  }, [boatId, user]);

  const loadBoat = async () => {
    try {
      const response = await axios.get(`${API}/boats/${boatId}`);
      setBoat(response.data);
    } catch (error) {
      toast.error('Impossible de charger le bateau');
      navigate('/search');
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = async () => {
    try {
      const response = await axios.get(`${API}/favorites/check/${boatId}`, {
        headers: getAuthHeaders()
      });
      setIsFavorite(response.data.is_favorite);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      if (isFavorite) {
        await axios.delete(`${API}/favorites/${boatId}`, { headers: getAuthHeaders() });
        setIsFavorite(false);
        toast.success('Retiré des favoris');
      } else {
        await axios.post(`${API}/favorites/${boatId}`, {}, { headers: getAuthHeaders() });
        setIsFavorite(true);
        toast.success('Ajouté aux favoris');
      }
    } catch (error) {
      toast.error('Une erreur est survenue');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: boat.name,
        text: `Découvrez ${boat.name} sur BoatRental`,
        url: window.location.href
      });
    } catch (error) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Lien copié !');
    }
  };

  const handleBook = () => {
    if (!user) {
      navigate('/login', { state: { from: `/booking/${boatId}` } });
      return;
    }
    navigate(`/booking/${boatId}`);
  };

  const nextImage = () => {
    if (boat?.images) {
      setCurrentImageIndex((prev) => (prev + 1) % boat.images.length);
    }
  };

  const prevImage = () => {
    if (boat?.images) {
      setCurrentImageIndex((prev) => (prev - 1 + boat.images.length) % boat.images.length);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!boat) return null;

  return (
    <div className="min-h-screen bg-white pb-32 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full"
            data-testid="back-button"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleShare}
              className="p-2 hover:bg-slate-100 rounded-full"
            >
              <Share2 size={20} />
            </button>
            <button 
              onClick={handleFavorite}
              className={`p-2 hover:bg-slate-100 rounded-full heart-button ${isFavorite ? 'active' : ''}`}
              data-testid="favorite-button"
            >
              <Heart 
                size={20} 
                className={isFavorite ? 'fill-red-500 text-red-500' : ''} 
              />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="md:flex md:gap-8 md:p-6">
          {/* Image Gallery */}
          <div className="md:w-3/5">
            <div className="relative aspect-[4/3] md:rounded-2xl overflow-hidden">
              <img
                src={boat.images?.[currentImageIndex] || 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800'}
                alt={boat.name}
                className="w-full h-full object-cover"
              />

              {boat.images?.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white"
                  >
                    <ChevronRight size={20} />
                  </button>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {boat.images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`carousel-dot ${idx === currentImageIndex ? 'active' : ''}`}
                      />
                    ))}
                  </div>
                </>
              )}

              {boat.is_verified && (
                <div className="absolute top-4 left-4">
                  <Badge className="badge-verified">
                    <Anchor size={12} className="mr-1" />
                    Vérifié
                  </Badge>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {boat.images?.length > 1 && (
              <div className="hidden md:flex gap-2 mt-4">
                {boat.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-20 h-16 rounded-lg overflow-hidden border-2 ${
                      idx === currentImageIndex ? 'border-teal-600' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 p-4 md:p-0">
            {/* Title & Rating */}
            <div className="mb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                {boat.name}
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Star size={18} className="fill-orange-500 text-orange-500" />
                  <span className="font-semibold">{boat.rating?.toFixed(1) || 'Nouveau'}</span>
                  {boat.review_count > 0 && (
                    <span className="text-slate-500">({boat.review_count} avis)</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-slate-600">
                  <MapPin size={16} />
                  <span>{boat.location}, {boat.city}</span>
                </div>
              </div>
            </div>

            {/* Quick Info */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <Users size={20} className="mx-auto text-teal-600 mb-1" />
                <p className="text-sm text-slate-500">Capacité</p>
                <p className="font-semibold">{boat.capacity} pers.</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <Ruler size={20} className="mx-auto text-teal-600 mb-1" />
                <p className="text-sm text-slate-500">Longueur</p>
                <p className="font-semibold">{boat.length}m</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <Calendar size={20} className="mx-auto text-teal-600 mb-1" />
                <p className="text-sm text-slate-500">Année</p>
                <p className="font-semibold">{boat.year}</p>
              </div>
            </div>

            {/* Price Card - Desktop */}
            <div className="hidden md:block bg-white border border-slate-200 rounded-2xl p-6 shadow-lg mb-6">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold text-slate-900">
                  {formatPrice(boat.price_per_day)}
                </span>
                <span className="text-slate-500">/ jour</span>
              </div>

              {boat.has_skipper && (
                <p className="text-sm text-slate-600 mb-4">
                  Skipper disponible: +{formatPrice(boat.skipper_price)}/jour
                </p>
              )}

              <Button 
                className="w-full h-12 rounded-full bg-teal-600 hover:bg-teal-700 text-lg"
                onClick={handleBook}
                data-testid="book-button"
              >
                Réserver
              </Button>
            </div>

            <Separator className="my-6" />

            {/* Owner */}
            {boat.owner && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Propriétaire</h3>
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={boat.owner.picture} />
                    <AvatarFallback>{boat.owner.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{boat.owner.name}</p>
                    {boat.is_verified && (
                      <p className="text-sm text-teal-600">Propriétaire vérifié</p>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-full"
                    onClick={() => navigate(`/messages/${boat.owner.user_id}`)}
                  >
                    <MessageCircle size={16} className="mr-2" />
                    Contacter
                  </Button>
                </div>
              </div>
            )}

            <Separator className="my-6" />

            {/* Description */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Description</h3>
              <p className="text-slate-600 leading-relaxed">{boat.description}</p>
            </div>

            {/* Features */}
            {boat.features?.length > 0 && (
              <>
                <Separator className="my-6" />
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Équipements</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {boat.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-slate-600">
                        <Check size={16} className="text-teal-600" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Reviews */}
            {boat.reviews?.length > 0 && (
              <>
                <Separator className="my-6" />
                <div>
                  <h3 className="font-semibold mb-4">Avis ({boat.reviews.length})</h3>
                  <div className="space-y-4">
                    {boat.reviews.slice(0, 3).map((review) => (
                      <div key={review.review_id} className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{review.user_name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{review.user_name}</span>
                          <div className="flex items-center gap-1 ml-auto">
                            <Star size={14} className="fill-orange-500 text-orange-500" />
                            <span className="font-medium">{review.rating}</span>
                          </div>
                        </div>
                        <p className="text-slate-600 text-sm">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Booking Bar */}
      <div className="sticky-booking-bar md:hidden">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold">{formatPrice(boat.price_per_day)}</span>
            <span className="text-slate-500"> / jour</span>
          </div>
          <Button 
            className="rounded-full bg-teal-600 hover:bg-teal-700 px-8"
            onClick={handleBook}
            data-testid="book-button-mobile"
          >
            Réserver
          </Button>
        </div>
      </div>
    </div>
  );
}
