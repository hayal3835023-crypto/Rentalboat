import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Upload, X, Plus, Ship, MapPin, Users, Ruler, 
  Calendar, Euro, Anchor, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  { id: 'yacht', name: 'Yacht' },
  { id: 'voilier', name: 'Voilier' },
  { id: 'bateau-moteur', name: 'Bateau à moteur' },
  { id: 'jet-ski', name: 'Jet Ski' },
  { id: 'catamaran', name: 'Catamaran' },
  { id: 'peniche', name: 'Péniche' }
];

const CITIES = [
  'Cannes', 'Nice', 'Marseille', 'Saint-Tropez', 'La Rochelle', 
  'Ajaccio', 'Antibes', 'Monaco', 'Toulon', 'Bordeaux'
];

const FEATURES_OPTIONS = [
  'Climatisation', 'Wi-Fi', 'Cuisine équipée', 'Douche', 'Toilettes',
  'GPS', 'Radar', 'Pilote automatique', 'Annexe', 'Paddle',
  'Équipement de plongée', 'Barbecue', 'Sono', 'Jacuzzi',
  'Plateforme de baignade', 'Kayak', 'Matériel de pêche'
];

export default function BoatFormPage() {
  const { boatId } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const isEdit = !!boatId;

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [location, setLocation] = useState('');
  const [pricePerDay, setPricePerDay] = useState('');
  const [capacity, setCapacity] = useState('');
  const [length, setLength] = useState('');
  const [year, setYear] = useState('');
  const [hasSkipper, setHasSkipper] = useState(false);
  const [skipperPrice, setSkipperPrice] = useState('');
  const [features, setFeatures] = useState([]);
  const [images, setImages] = useState(['']);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  useEffect(() => {
    if (isEdit) {
      loadBoat();
    }
  }, [boatId]);

  // Auto-fill coordinates based on city
  useEffect(() => {
    const cityCoords = {
      'Cannes': { lat: 43.5507, lng: 7.0127 },
      'Nice': { lat: 43.6961, lng: 7.2692 },
      'Marseille': { lat: 43.2951, lng: 5.3730 },
      'Saint-Tropez': { lat: 43.2676, lng: 6.6407 },
      'La Rochelle': { lat: 46.1591, lng: -1.1520 },
      'Ajaccio': { lat: 41.9192, lng: 8.7386 },
      'Antibes': { lat: 43.5804, lng: 7.1251 },
      'Monaco': { lat: 43.7384, lng: 7.4246 },
      'Toulon': { lat: 43.1242, lng: 5.9280 },
      'Bordeaux': { lat: 44.8378, lng: -0.5792 }
    };
    
    if (city && cityCoords[city] && !latitude && !longitude) {
      setLatitude(cityCoords[city].lat.toString());
      setLongitude(cityCoords[city].lng.toString());
    }
  }, [city]);

  const loadBoat = async () => {
    try {
      const response = await axios.get(`${API}/boats/${boatId}`, {
        headers: getAuthHeaders()
      });
      const boat = response.data;
      
      setName(boat.name);
      setDescription(boat.description);
      setCategory(boat.category);
      setCity(boat.city);
      setLocation(boat.location);
      setPricePerDay(boat.price_per_day.toString());
      setCapacity(boat.capacity.toString());
      setLength(boat.length.toString());
      setYear(boat.year.toString());
      setHasSkipper(boat.has_skipper);
      setSkipperPrice(boat.skipper_price?.toString() || '');
      setFeatures(boat.features || []);
      setImages(boat.images?.length ? boat.images : ['']);
      setLatitude(boat.latitude?.toString() || '');
      setLongitude(boat.longitude?.toString() || '');
    } catch (error) {
      toast.error('Impossible de charger le bateau');
      navigate('/owner/boats');
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = () => {
    setImages([...images, '']);
  };

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleImageChange = (index, value) => {
    const newImages = [...images];
    newImages[index] = value;
    setImages(newImages);
  };

  const toggleFeature = (feature) => {
    if (features.includes(feature)) {
      setFeatures(features.filter(f => f !== feature));
    } else {
      setFeatures([...features, feature]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!name || !description || !category || !city || !pricePerDay || !capacity) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const validImages = images.filter(img => img.trim());
    if (validImages.length === 0) {
      toast.error('Ajoutez au moins une image');
      return;
    }

    setSubmitting(true);

    const boatData = {
      name,
      description,
      category,
      city,
      location: location || `Port de ${city}`,
      price_per_day: parseFloat(pricePerDay),
      capacity: parseInt(capacity),
      length: parseFloat(length) || 10,
      year: parseInt(year) || new Date().getFullYear(),
      has_skipper: hasSkipper,
      skipper_price: hasSkipper ? parseFloat(skipperPrice) || 0 : 0,
      features,
      images: validImages,
      latitude: parseFloat(latitude) || 43.5,
      longitude: parseFloat(longitude) || 7.0
    };

    try {
      if (isEdit) {
        await axios.put(`${API}/boats/${boatId}`, boatData, {
          headers: getAuthHeaders()
        });
        toast.success('Annonce mise à jour !');
      } else {
        await axios.post(`${API}/boats`, boatData, {
          headers: getAuthHeaders()
        });
        toast.success('Annonce publiée avec succès !');
      }
      navigate('/owner/boats');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">
            {isEdit ? 'Modifier l\'annonce' : 'Publier un bateau'}
          </h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Ship size={20} className="text-teal-600" />
            Informations générales
          </h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom du bateau *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Yacht Prestige 500"
                className="mt-1 rounded-xl"
                data-testid="boat-name-input"
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre bateau, son état, ses atouts..."
                className="mt-1 rounded-xl min-h-[120px]"
                data-testid="boat-description-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Catégorie *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Ville *</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="location">Emplacement précis</Label>
              <div className="relative mt-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Port de Cannes"
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Specifications */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Ruler size={20} className="text-teal-600" />
            Caractéristiques
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="capacity">Capacité (pers.) *</Label>
              <div className="relative mt-1">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  id="capacity"
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="8"
                  className="pl-10 rounded-xl"
                  min="1"
                  data-testid="boat-capacity-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="length">Longueur (m)</Label>
              <div className="relative mt-1">
                <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  id="length"
                  type="number"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  placeholder="12"
                  className="pl-10 rounded-xl"
                  step="0.1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="year">Année</Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2022"
                  className="pl-10 rounded-xl"
                  min="1990"
                  max={new Date().getFullYear()}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="price">Prix par jour (€) *</Label>
              <div className="relative mt-1">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  id="price"
                  type="number"
                  value={pricePerDay}
                  onChange={(e) => setPricePerDay(e.target.value)}
                  placeholder="500"
                  className="pl-10 rounded-xl"
                  min="1"
                  data-testid="boat-price-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Skipper Option */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                <Anchor size={20} className="text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold">Option skipper</h3>
                <p className="text-sm text-slate-500">Proposez un skipper professionnel</p>
              </div>
            </div>
            <Switch
              checked={hasSkipper}
              onCheckedChange={setHasSkipper}
            />
          </div>

          {hasSkipper && (
            <div>
              <Label htmlFor="skipperPrice">Prix du skipper par jour (€)</Label>
              <Input
                id="skipperPrice"
                type="number"
                value={skipperPrice}
                onChange={(e) => setSkipperPrice(e.target.value)}
                placeholder="200"
                className="mt-1 rounded-xl"
                min="0"
              />
            </div>
          )}
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="font-semibold text-lg mb-4">Équipements</h2>
          <div className="flex flex-wrap gap-2">
            {FEATURES_OPTIONS.map(feature => (
              <button
                key={feature}
                type="button"
                onClick={() => toggleFeature(feature)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  features.includes(feature)
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {features.includes(feature) && <Check size={14} className="inline mr-1" />}
                {feature}
              </button>
            ))}
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Upload size={20} className="text-teal-600" />
            Photos *
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Ajoutez les URLs de vos images (utilisez Unsplash, Imgur, etc.)
          </p>

          <div className="space-y-3">
            {images.map((img, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={img}
                  onChange={(e) => handleImageChange(index, e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 rounded-xl"
                />
                {images.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleRemoveImage(index)}
                    className="rounded-xl"
                  >
                    <X size={18} />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleAddImage}
            className="mt-3 rounded-full"
          >
            <Plus size={16} className="mr-2" />
            Ajouter une image
          </Button>

          {/* Image Preview */}
          {images.some(img => img.trim()) && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {images.filter(img => img.trim()).map((img, index) => (
                <div key={index} className="aspect-video rounded-lg overflow-hidden bg-slate-100">
                  <img 
                    src={img} 
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={submitting}
          className="w-full h-14 rounded-full bg-teal-600 hover:bg-teal-700 text-lg"
          data-testid="submit-boat-btn"
        >
          {submitting ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isEdit ? (
            'Mettre à jour l\'annonce'
          ) : (
            'Publier l\'annonce'
          )}
        </Button>
      </form>
    </div>
  );
}
